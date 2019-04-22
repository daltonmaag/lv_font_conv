
'use strict';


module.exports.autocrop = function autocrop(glyph) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  // scan the entire image trying to find bbox
  for (let y = 0; y < glyph.bbox.height; y++) {
    for (let x = 0; x < glyph.bbox.width; x++) {
      if (glyph.pixels[y][x]) {
        minX = x > minX ? minX : x;
        minY = y > minY ? minY : y;
        maxX = x < maxX ? maxX : x;
        maxY = y < maxY ? maxY : y;
      }
    }
  }

  // create new pixels array
  let pixels = [];

  for (let y = minY; y <= maxY; y++) {
    let line = [];

    for (let x = minX; x <= maxX; x++) {
      line.push(glyph.pixels[y][x]);
    }

    pixels.push(line);
  }

  let bbox;

  if (minX <= maxX && minY <= maxY) {
    bbox = {
      x: minX + glyph.bbox.x,
      y: minY + glyph.bbox.y,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };
  } else {
    // bounding box doesn't exist, e.g. whitespace
    bbox = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };
  }

  return Object.assign({}, glyph, { pixels, bbox });
};


function set_byte_depth(depth) {
  return function (byte) {
    // calculate significant bits, e.g. for depth=2 it's 0, 1, 2 or 3
    let value = ~~(byte / (256 >> depth));

    // spread those bits around 0..255 range, e.g. for depth=2 it's 0, 85, 170 or 255
    let scale = (2 << (depth - 1)) - 1;

    return (value * 0xFFFF / scale) >> 8;
  };
}


module.exports.set_depth = function set_depth(glyph, depth) {
  let pixels = [];
  let fn = set_byte_depth(depth);

  for (let y = 0; y < glyph.bbox.height; y++) {
    pixels.push(glyph.pixels[y].map(fn));
  }

  return Object.assign({}, glyph, { pixels });
};


function count_bits(val) {
  let count = 0;
  val = ~~val;

  while (val) {
    count++;
    val >>= 1;
  }

  return count;
}

// Minimal number of bits to store unsigned value
module.exports.unsigned_bits = count_bits;

// Minimal number of bits to store signed value
module.exports.signed_bits = function signed_bits(val) {
  if (val >= 0) return count_bits(val) + 1;

  return count_bits(Math.abs(val) - 1) + 1;
};

// Align value to 4x - useful to create word-aligned arrays
module.exports.align4 = function align4(size) {
  if (size % 4 === 0) return size;
  return size + 4 - (size % 4);
};

// Pre-filter image to improve compression ratio
// In this case - XOR lines, because it's very effective
// in decompressor and does not depend on bpp.
module.exports.prefilter = function prefilter(pixels) {
  return pixels.map((line, l_idx, arr) => {
    if (l_idx === 0) return line.slice();

    return line.map((p, idx) => p ^ arr[l_idx - 1][idx]);
  });
};