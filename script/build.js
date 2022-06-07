const StyleDictionaryPackage = require("style-dictionary");

StyleDictionaryPackage.registerFormat({
  name: "css/variables",
  formatter: function (dictionary, config) {
    return `${this.selector} {
        ${dictionary.allProperties
          .map((prop) => `  --${prop.name}: ${prop.value};`)
          .join("\n")}
      }`;
  },
});

StyleDictionaryPackage.registerTransform({
  name: "sizes/px",
  type: "value",
  matcher: function (prop) {
    // You can be more specific here if you only want 'em' units for font sizes
    return [
      "fontSize",
      "spacing",
      "borderRadius",
      "borderWidth",
      "sizing",
    ].includes(prop.attributes.category);
  },
  transformer: function (prop) {
    // You can also modify the value here if you want to convert pixels to ems
    return parseFloat(prop.original.value) + "px";
  },
});

/**
 * Transform shadow shorthands for css variables
 */
function transformShadow(shadow) {
  const { x, y, blur, spread, color } = shadow;
  return `${x} ${y} ${blur} ${spread} ${color}`;
}
StyleDictionaryPackage.registerTransform({
  name: "shadow/shorthand",
  type: "value",
  transitive: true,
  matcher: (token) => ["boxShadow"].includes(token.type),
  transformer: (token) => {
    return Array.isArray(token.original.value)
      ? token.original.value.map((single) => transformShadow(single)).join(", ")
      : transformShadow(token.original.value);
  },
});

function getStyleDictionaryConfig(theme) {
  return {
    source: [`tokens/${theme}.json`],
    platforms: {
      web: {
        transforms: [
          "attribute/cti",
          "name/cti/kebab",
          "sizes/px",
          "shadow/shorthand",
        ],
        buildPath: `dist/`,
        files: [
          {
            destination: `${theme}.css`,
            format: "css/variables",
            selector: `.${theme}-theme`,
          },
        ],
      },
    },
  };
}

console.log("Building tokens...");

["global", "dark", "light"].map(function (theme) {
  console.log("\n==============================================");
  console.log(`\nProcessing: [${theme}]`);

  const StyleDictionary = StyleDictionaryPackage.extend(
    getStyleDictionaryConfig(theme)
  );

  StyleDictionary.buildPlatform("web");

  console.log("\nEnd processing");
});

console.log("\n==============================================");
console.log("\nBuild completed!");
