
// https://github.com/munach/obsidian-extract-pdf-annotations/blob/master/src/extractHighlight.ts


function countWideLetters(str: string): number {
	const wideLetters = ['w', 'm', 'W', 'M', 'D', 'O', 'Q', 'G', 'S', 'B', 'C', 'P', 'E', 'R', 'A', 'N', 'U', 'V', 'X', 'Y', 'Z', 'K', 'H'];
	return str.split('').filter(char => wideLetters.includes(char)).length;
}

function countSlimLetters(str: string): number {
	const slimLetters = ['i', 'r', 'l', 't', 'f', 'j', 'I', '1', '.', ',', '(', ')', '"', '\''];
	return str.split('').filter(char => slimLetters.includes(char)).length;
}

function roundBasedOnLetterWidths(x: any, start: number, exactLength: number): number {
	const mathRounding = Math.round(exactLength);
	const substrWithMathRounding = x.str.substr(start, mathRounding);
	let correctRounding = mathRounding;

	if (countWideLetters(substrWithMathRounding) > countSlimLetters(substrWithMathRounding)) {
		correctRounding = Math.floor(exactLength);
	} else if (countWideLetters(substrWithMathRounding) < countSlimLetters(substrWithMathRounding)) {
		correctRounding = Math.ceil(exactLength);
	} else {
		correctRounding = mathRounding;
	}

	return correctRounding;
}

// return text between min and max, x and y
function searchQuad(
	minx: number,
	maxx: number,
	miny: number,
	maxy: number,
	items: any
) {
	const mycontent = items.reduce(function (txt: string, x: any) {
		if (x.width == 0) return txt; // eliminate empty stuff
		if (!(miny <= x.transform[5] && x.transform[5] <= maxy)) return txt; // y coordinate not in box
		if (x.transform[4] + x.width < minx) return txt; // end of txt before highlight starts
		if (x.transform[4] > maxx) return txt; // start of text after highlight ends

		const start =
			x.transform[4] >= minx
				? 0 // start at pos 0, when text starts after hightlight start
				: Math.round(
						(x.str.length * (minx - x.transform[4])) / x.width
				); // otherwise, rule of three: start proportional
		if (x.transform[4] + x.width <= maxx) {
			// end of txt ends before highlight ends
			return txt + x.str.substr(start); //
		} else {
			// else, calculate proporation end to get the expected length
			const exactLength = (x.str.length * (maxx - x.transform[4])) / x.width;
			const lenc =
				roundBasedOnLetterWidths(x, start, exactLength) -
				start;
			return txt + x.str.substr(start, lenc);
		}
	}, "");
	return mycontent.trim();
}

// iterate over all QuadPoints and join retrieved lines
export function extractHighlight(annot: any, items: any) {
	const legacyQuadPoints = [];
	// Recreate legacy quadPoints array, with the form [[{x: 1, y: 2}, {x: 3, y: 4}, {x: 5, y: 6}, {x: 7, y: 8}], ...]
	// One quad is 4 points (x,y) in the order tL, tR, bL, bR, multiple quads for multiple lines
	for (let i = 0; i < annot.quadPoints.length / 8; i++) {
		const oneQuad = [];
		for (let j = 0; j < 8; j = j + 2) {
			oneQuad.push({
				x: annot.quadPoints[j + i * 8],
				y: annot.quadPoints[j + 1 + i * 8],
			});
		}
		legacyQuadPoints.push(oneQuad);
	}
	const highlight = legacyQuadPoints.reduce((txt: string, quad: any) => {
		const minx = quad.reduce(
			(prev: number, curr: any) => Math.min(prev, curr.x),
			quad[0].x
		);
		const maxx = quad.reduce(
			(prev: number, curr: any) => Math.max(prev, curr.x),
			quad[0].x
		);
		const miny = quad.reduce(
			(prev: number, curr: any) => Math.min(prev, curr.y),
			quad[0].y
		);
		const maxy = quad.reduce(
			(prev: number, curr: any) => Math.max(prev, curr.y),
			quad[0].y
		);
		const res = searchQuad(minx, maxx, miny, maxy, items);
		// if the last character of txt (previous lines) is not a hyphen, we concatenate the lines, by adding a blank
		if (txt != "" && txt.substring(txt.length - 1) != "-") {
			return txt + " " + res;
		} else if (
			txt.substring(txt.length - 2).toLowerCase() ==
				txt.substring(txt.length - 2) && // end by lowercase-
			res.substring(0, 1).toLowerCase() == res.substring(0, 1)
		) {
			// and start with lowercase
			return txt.substring(0, txt.length - 1) + res; // remove hyphon
		} else {
			return txt + res; // keep hyphon or if the previous text is empty, return the whole result
		}
	}, "");
	return highlight;
}

