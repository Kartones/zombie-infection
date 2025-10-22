"use strict";

function colorsEqual(array1, array2) {
  return array1[0] === array2[0];
}

function colorToEntityType(color) {
  const key = `${color[0]},${color[1]},${color[2]}`;
  return COLOR_TO_ENTITY_TYPE[key] !== undefined
    ? COLOR_TO_ENTITY_TYPE[key]
    : ENTITY_TYPES.NONE;
}
