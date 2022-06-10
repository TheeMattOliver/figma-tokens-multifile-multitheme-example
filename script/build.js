const StyleDictionaryPackage = require("style-dictionary");
const { fileHeader, formattedVariables } = StyleDictionaryPackage.formatHelpers;
const { kebabCase, isPx } = require("../lib/utils");

/**
 * format for css variables
 */
StyleDictionaryPackage.registerFormat({
  name: "css/variables",
  formatter: function(dictionary, config) {
    return `${this.selector} {
        ${dictionary.allProperties
          .map((prop) => `  --${prop.name}: ${prop.value};`)
          .join("\n")}
      }`;
  },
});

/**
 * format for javascript/module
 */
StyleDictionaryPackage.registerFormat({
  name: "javascript/module",
  formatter: function({ dictionary, file }) {
    const recursiveleyFlattenDictionary = (obj) => {
      const tree = {};
      if (typeof obj !== "object" || Array.isArray(obj)) {
        return obj;
      }

      if (obj.hasOwnProperty("value")) {
        return obj.value;
      } else {
        for (const name in obj) {
          if (obj.hasOwnProperty(name)) {
            tree[name] = recursiveleyFlattenDictionary(obj[name]);
          }
        }
      }
      return tree;
    };

    return (
      fileHeader({ file }) +
      "module.exports = " +
      JSON.stringify(recursiveleyFlattenDictionary(dictionary.tokens), null, 2)
    );
  },
});

/**
 * transform: js variable names
 * example: `namespace.item.variant.property.modifier`
 */
StyleDictionaryPackage.registerTransform({
  name: "name/js",
  type: "name",
  transformer: (token, options) => {
    return token.path.join(".");
  },
});

/**
 * transform: js es6 variable names
 * example: `NamespaceItemVariantPropertyModifier`
 */
StyleDictionaryPackage.registerTransform({
  name: "name/js/es6",
  type: "name",
  transformer: (token, options) => {
    const tokenPath = token.path.join(" ");
    const tokenPathItems = tokenPath.split(" ");
    for (var i = 0; i < tokenPathItems.length; i++) {
      tokenPathItems[i] =
        tokenPathItems[i].charAt(0).toUpperCase() + tokenPathItems[i].slice(1);
    }
    const tokenName = tokenPathItems.join("");
    return tokenName;
  },
});

StyleDictionaryPackage.registerTransform({
  name: "sizes/px",
  type: "value",
  matcher: function(prop) {
    return [
      "fontSize",
      "spacing",
      "borderRadius",
      "borderWidth",
      "sizing",
    ].includes(prop.attributes.category);
  },
  transformer: function(prop) {
    // You can also modify the value here if you want to convert pixels to ems
    return parseFloat(prop.original.value) + "px";
  },
});

// transform: px to rem
StyleDictionaryPackage.registerTransform({
  name: "pxToRem",
  type: "value",
  transformer: (token, options) => {
    if (isPx(token.value)) {
      const baseFontSize = 16;
      const floatValue = parseFloat(token.value.replace("px", ""));

      if (isNaN(floatValue)) {
        return token.value;
      }

      if (floatValue === 0) {
        return "0";
      }

      return `${floatValue / baseFontSize}rem`;
    }
    return token.value;
  },
});

/**
 * Transform shadow shorthands for css variables
 */

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

// transform: composite typography to shorthands
StyleDictionaryPackage.registerTransform({
  name: "typography/shorthand",
  type: "value",
  transitive: true,
  matcher: (token) => token.type === "typography",
  transformer: (token) => {
    const { value } = token;
    return `${value.fontWeight} ${value.fontSize}/${value.lineHeight} ${value.fontFamily}`;
  },
});

function getStyleDictionaryConfig(theme) {
  return {
    source: [`tokens/${theme}.json`],
    platforms: {
      css: {
        transforms: [
          "attribute/cti",
          "name/cti/kebab",
          "sizes/px",
          "shadow/shorthand",
          "pxToRem",
          "typography/shorthand",
        ],
        buildPath: `dist/`,
        files: [
          {
            destination: `css/${theme}.css`,
            format: "css/variables",
            selector: `.${theme}-theme`,
          },
        ],
      },
      js: {
        buildPath: `dist/`,
        transforms: ["name/js/es6", "pxToRem"],
        // map the array of token file paths to style dictionary output files
        files: [
          {
            destination: `js/esm/${theme}.js`,
            format: `javascript/es6`,
          },
        ],
      },
      scss: {
        buildPath: `dist/`,
        transforms: [
          "attribute/cti",
          "name/cti/kebab",
          "sizes/px",
          "shadow/shorthand",
          "pxToRem",
          "typography/shorthand",
        ],
        // map the array of token file paths to style dictionary output files
        files: [
          {
            destination: `scss/${theme}.scss`,
            format: `javascript/es6`,
          },
        ],
      },
      jsModule: {
        buildPath: `dist/`,
        transforms: ["pxToRem"],
        // map the array of token file paths to style dictionary output files
        files: [
          {
            destination: `js/module/${theme}.js`,
            format: `javascript/module`,
          },
        ],
      },
    },
  };
}

console.log("Building tokens...");

["dark", "light"].map(function(theme) {
  console.log("\n==============================================");
  console.log(`\nProcessing: [${theme}]`);

  const StyleDictionary = StyleDictionaryPackage.extend(
    getStyleDictionaryConfig(theme)
  );
  const platforms = ["css", "js", "jsModule", "scss"];
  platforms.map((platform) => {
    return StyleDictionary.buildPlatform(platform);
  });

  console.log("\nEnd processing");
});

console.log("\n==============================================");
console.log("\nBuild completed!");
