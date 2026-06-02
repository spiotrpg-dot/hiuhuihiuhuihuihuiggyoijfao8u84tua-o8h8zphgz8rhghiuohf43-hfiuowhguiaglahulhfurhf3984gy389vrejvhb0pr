

function incrementTransaction(count) {
    return (count || 0) + 1;
}

const LOW_DPI = 48;
const HIGH_DPI = 96;

let targetResolution = [64, 48];
const interactionSelectors = [
    "input-image-selector",
    "input-image-selector-hidden",
    "width-slider",
    "height-slider",
    "hue-slider",
    "saturation-slider",
    "value-slider",
    "reset-hsv-button",
    "reset-brightness-button",
    "reset-contrast-button",
    "clear-overrides-button",
    "toggle-expansion-button",
].map((id) => document.getElementById(id));

const customStudTableBody = document.getElementById("custom-stud-table-body");
let colorHex = [];

function disableInteraction() {
    interactionSelectors.forEach((button) => (button.disabled = true));
    [...document.getElementsByTagName("input")].forEach((button) => (button.disabled = true));
    [...document.getElementsByClassName("btn")].forEach((button) => (button.disabled = true));
    [...document.getElementsByClassName("nav-link")].forEach((link) => (link.className = link.className + " disabled"));
    document.getElementById("universal-loading-progress").hidden = false;
    document.getElementById("universal-loading-progress-complement").hidden = true;
    if (inputImageCropper != null) {
        inputImageCropper.disable();
    }
}

function enableInteraction() {
    interactionSelectors.forEach((button) => (button.disabled = false));
    [...document.getElementsByTagName("input")].forEach((button) => {
        button.disabled = button.className.includes("always-disabled");
    });
    [...document.getElementsByClassName("btn")].forEach((button) => (button.disabled = false));
    [...document.getElementsByClassName("nav-link")].forEach(
        (link) => (link.className = link.className.replace(/ disabled/g, ""))
    );
    document.getElementById("universal-loading-progress").hidden = true;
    document.getElementById("universal-loading-progress-complement").hidden = false;
    if (inputImageCropper != null) {
        inputImageCropper.enable();
    }
}

if (window.location.href.includes("forceUnsupportedDimensions")) {
    ["height-slider", "width-slider"].forEach((id) => {
        document.getElementById(id).step = 1;
        document.getElementById(id).type = "number";
    });
}

const CNN_INPUT_IMAGE_WIDTH = 256;
const CNN_INPUT_IMAGE_HEIGHT = 256;

let inputImage = null;

const inputCanvas = document.getElementById("input-canvas");
const inputCanvasContext = inputCanvas.getContext("2d");
const inputDepthCanvas = document.getElementById("input-depth-canvas");
const inputDepthCanvasContext = inputDepthCanvas.getContext("2d");

const webWorkerInputCanvas = document.getElementById("web-worker-input-canvas");

const webWorkerOutputCanvas = document.getElementById("web-worker-output-canvas");


const step1CanvasUpscaled = document.getElementById("step-1-canvas-upscaled");
const step1CanvasUpscaledContext = step1CanvasUpscaled.getContext("2d");
const step1DepthCanvasUpscaled = document.getElementById("step-1-depth-canvas-upscaled");
const step2Canvas = document.getElementById("step-2-canvas");
const step2CanvasContext = step2Canvas.getContext("2d");
const step2CanvasUpscaled = document.getElementById("step-2-canvas-upscaled");
const step2CanvasUpscaledContext = step2CanvasUpscaled.getContext("2d");
const step2DepthCanvas = document.getElementById("step-2-depth-canvas");

const step2DepthCanvasUpscaled = document.getElementById("step-2-depth-canvas-upscaled");


const step3Canvas = document.getElementById("step-3-canvas");
const step3CanvasContext = step3Canvas.getContext("2d");
const step3CanvasUpscaled = document.getElementById("step-3-canvas-upscaled");
const step3CanvasUpscaledContext = step3CanvasUpscaled.getContext("2d");
const step3DepthCanvas = document.getElementById("step-3-depth-canvas");

const step3DepthCanvasUpscaled = document.getElementById("step-3-depth-canvas-upscaled");


const step4Canvas = document.getElementById("step-4-canvas");
const step4CanvasContext = step4Canvas.getContext("2d");
const step4CanvasUpscaled = document.getElementById("step-4-canvas-upscaled");
const step4CanvasUpscaledContext = step4CanvasUpscaled.getContext("2d");
const step4Canvas3dUpscaled = document.getElementById("step-4-canvas-3d-upscaled");

const bricklinkCacheCanvas = document.getElementById("bricklink-cache-canvas");



targetResolution = [
    Number(document.getElementById("width-slider").textContent) * 16,
    Number(document.getElementById("height-slider").textContent) * 16,
];
const PIXEL_WIDTH_CM = 0.8;
const INCHES_IN_CM = 0.393701;
const SCALING_FACTOR = 40;
const PLATE_WIDTH = 16;

let inputImageCropper;

function initializeCropper() {
    if (inputImageCropper != null) {
        inputImageCropper.destroy();
    }
    inputImageCropper = new Cropper(step1CanvasUpscaled, {
        aspectRatio: targetResolution[0] / targetResolution[1],
        viewMode: 2,
        minContainerWidth: 1,
        minContainerHeight: 1,
        cropend() {
            overridePixelArray = new Array(targetResolution[0] * targetResolution[1] * 4).fill(null);
            overrideDepthPixelArray = new Array(targetResolution[0] * targetResolution[1] * 4).fill(null);
        },
    });
 
}


step1CanvasUpscaled.addEventListener("cropend", runStep1);

window.addEventListener("resize", () => {
    [step4Canvas].forEach((canvas) => {
        canvas.height = (window.getComputedStyle(canvas).width * targetResolution[1]) / targetResolution[0];
    });
});




const quantizationAlgorithmsInfo = {
    twoPhase: {
        name: "2 Phase",
    },
    floydSteinberg: {
        name: "Floyd-Steinberg Dithering",
    },
    jarvisJudiceNinkeDithering: {
        name: "Jarvis-Judice-Ninke Dithering",
    },
    atkinsonDithering: {
        name: "Atkinson Dithering",
    },
    sierraDithering: {
        name: "Sierra Dithering",
    },
    greedy: {
        name: "Greedy",
    },
    greedyWithDithering: {
        name: "Greedy Gaussian Dithering",
    },
};

const quantizationAlgorithmToTraditionalDitheringKernel = {
    floydSteinberg: FLOYD_STEINBERG_DITHERING_KERNEL,
    jarvisJudiceNinkeDithering: JARVIS_JUDICE_NINKE_DITHERING_KERNEL,
    atkinsonDithering: ATKINSON_DITHERING_KERNEL,
    sierraDithering: SIERRA_DITHERING_KERNEL,
};

const defaultQuantizationAlgorithmKey = "twoPhase";
let quantizationAlgorithm = defaultQuantizationAlgorithmKey;

let selectedPixelPartNumber = PIXEL_TYPE_OPTIONS[0].number;
let overridePixelArray = new Array(targetResolution[0] * targetResolution[1] * 4).fill(null);
let overrideDepthPixelArray = new Array(targetResolution[0] * targetResolution[1] * 4).fill(null);

function handleResolutionChange() {
    overridePixelArray = new Array(targetResolution[0] * targetResolution[1] * 4).fill(null);
    overrideDepthPixelArray = new Array(targetResolution[0] * targetResolution[1] * 4).fill(null);
    $('[data-toggle="tooltip"]').tooltip("dispose");
    $('[data-toggle="tooltip"]').tooltip();
    initializeCropper();
    runStep1();
}

document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        const step = item.dataset.step;
        document.querySelectorAll('.submenu').forEach(sub => {
            sub.style.display = 'none';
        });
        const submenu = document.getElementById(`submenu-${step}`);
        submenu.style.display = submenu.style.display === 'block' ? 'none' : 'block';
    });
});

function changeSize(direction, delta) {
    const el = document.getElementById(direction === 'vertical' ? 'height-slider' : 'width-slider');
    let val = parseInt(el.textContent);
    val = Math.max(1, Math.min(9, val + delta));
    el.textContent = val;

    targetResolution = [
        Number(document.getElementById("width-slider").textContent) * 16,
        Number(document.getElementById("height-slider").textContent) * 16,
    ];

    
    handleResolutionChange();
    
}

document.getElementById("clear-overrides-button").addEventListener("click", () => {
    overridePixelArray = new Array(targetResolution[0] * targetResolution[1] * 4).fill(null);
    runStep2();
    runStep3();
});


let DEFAULT_STUD_MAP = "all_tile_colors";
let DEFAULT_COLOR = "#36aebf";
let DEFAULT_COLOR_NAME = "Medium Azure";

try {
    const match = window.location.href.match("[?&]" + "availableColors" + "=([^&]+)");
    const availableColorsString = match ? match[1] : null;
    let availableColors;
    if (match == null) {
        availableColors = [];
    } else {
        availableColors = availableColorsString
            .split(",")
            .map((color) => color.toLowerCase())
            .filter((color) => color.match("^#(?:[0-9a-fA-F]{3}){1,2}$"));
    }

    if (availableColors.length > 0) {
        DEFAULT_COLOR = availableColors[0];
        DEFAULT_COLOR_NAME = availableColors[0];
        ALL_VALID_BRICKLINK_COLORS = availableColors
            .map((color) => {
                return {
                    name: color,
                    hex: color,
                };
            })
            .concat(ALL_VALID_BRICKLINK_COLORS);
        ALL_BRICKLINK_SOLID_COLORS = ALL_VALID_BRICKLINK_COLORS;
        const studMap = {};
        availableColors.forEach((color) => {
            studMap[color] = 99999;
        });
        STUD_MAPS = {
            url_colors: {
                name: "Colors from URL",
                officialName: "Colors from URL",
                sortedStuds: availableColors,
                studMap: studMap,
            },
            all_solid_colors: STUD_MAPS["all_solid_colors"],
        };
        DEFAULT_STUD_MAP = "url_colors";
        alert(JSON.stringify(availableColors));
    }
} catch (_e) {
    enableInteraction();
    alert(JSON.stringify(availableColors));
}

let selectedStudMap = STUD_MAPS[DEFAULT_STUD_MAP].studMap;
let selectedFullSetName = STUD_MAPS[DEFAULT_STUD_MAP].officialName;
let selectedSortedStuds = STUD_MAPS[DEFAULT_STUD_MAP].sortedStuds;

const slider = document.querySelector(".green-slider");


function populateCustomStudSelectors(studMap, shouldRunAfterPopulation) {
    const container = document.getElementById("customStudContainer");
    container.innerHTML = "";

    studMap.sortedStuds.forEach((stud) => {
        const colorName = HEX_TO_COLOR_NAME[stud] || stud || "(no color)";
        colorHex.push(stud);

        const colorTile = document.createElement("div");
        colorTile.classList.add("color-tile");
        colorTile.style.backgroundColor = stud;
        colorTile.title = colorName; 

        colorTile.dataset.hex = stud;
        colorTile.dataset.active = "true";

        colorTile.addEventListener("click", () => {
            const isActive = colorTile.dataset.active === "true";
            if (isActive) {
                colorHex = colorHex.filter(o => o !== stud)
                runCustomStudMap();
                colorTile.dataset.active = "false";
                colorTile.classList.add("inactive");
            } else {
                colorHex.push(stud);
                runCustomStudMap();
                colorTile.dataset.active = "true";
                colorTile.classList.remove("inactive");
            }
            runCustomStudMap();
        });

        container.appendChild(colorTile);
    });

    if (shouldRunAfterPopulation) runCustomStudMap();
}

function runCustomStudMap(skipStep1) {
    const customStudMap = {};
    const customSortedStuds = [];
    colorHex.forEach((studHex) => {
        customSortedStuds.push(studHex)
        const numStuds = 99999;
        customStudMap[studHex] = (customStudMap[studHex] || 0) + numStuds;
    });
        
    if (customSortedStuds.length > 0) {
        selectedStudMap = customStudMap;
        selectedFullSetName = "Custom";
        selectedSortedStuds = customSortedStuds;
    }
    if (!skipStep1) {
        runStep1();
    }
}

populateCustomStudSelectors(STUD_MAPS[DEFAULT_STUD_MAP], false);


const bricklinkPieceOptions = document.getElementById("bricklink-piece-options");
PIXEL_TYPE_OPTIONS.forEach((part) => {
    const option = document.createElement("a");
    option.className = "dropdown-item btn";
    option.textContent = part.name;
    option.value = part.number;
    option.addEventListener("click", () => {
        document.getElementById("bricklink-piece-button").innerHTML = part.name;
        selectedPixelPartNumber = part.number;
        const isVariable = ("" + selectedPixelPartNumber).match("^variable.*$");
        document.getElementById("pixel-dimensions-container-wrapper").hidden = !isVariable;

        if (isVariable) {
            const availableParts = [...document.getElementById("pixel-dimensions-container").children].forEach(
                (input) => {
                    const className = input.className;
                    const uniqueVariablePixelName = selectedPixelPartNumber.replace("variable_", "");
                    return (input.hidden = !className.includes(uniqueVariablePixelName));
                }
            );
        }
        runStep3();
    });
});

function isBleedthroughEnabled() {
    return [PIXEL_TYPE_OPTIONS[0].number, PIXEL_TYPE_OPTIONS[1].number].includes(selectedPixelPartNumber);
}

let selectedTiebreakTechnique = "alternatingmod";
const TIEBREAK_TECHNIQUES = [
    {
        name: "None",
        value: "none",
    },
    {
        name: "Random",
        value: "random",
    },
    {
        name: "Mod 2",
        value: "mod2",
    },
    {
        name: "Mod 3",
        value: "mod3",
    },
    {
        name: "Mod 4",
        value: "mod4",
    },
    {
        name: "Mod 5",
        value: "mod5",
    },
    {
        name: "Noisy Mod 2",
        value: "noisymod2",
    },
    {
        name: "Noisy Mod 3",
        value: "noisymod3",
    },
    {
        name: "Noisy Mod 4",
        value: "noisymod4",
    },
    {
        name: "Noisy Mod 5",
        value: "noisymod5",
    },
    {
        name: "Cascading Mod",
        value: "cascadingmod",
    },
    {
        name: "Cascading Noisy Mod",
        value: "cascadingnoisymod",
    },
    {
        name: "Alternating Mod",
        value: "alternatingmod",
    },
    {
        name: "Alternating Noisy Mod",
        value: "alternatingnoisymod",
    },
];
TIEBREAK_TECHNIQUES.forEach((technique) => {
    const option = document.createElement("a");
    option.className = "dropdown-item btn";
    option.textContent = technique.name;
    option.value = technique.value;
    option.addEventListener("click", () => {
        document.getElementById("color-ties-resolution-button").innerHTML =
            "Strategy: " + technique.name;
        selectedTiebreakTechnique = technique.value;
        runStep1();
    });
    
});

let selectedInterpolationAlgorithm = "default";
const INTERPOLATION_ALGORITHMS = [
    {
        name: "Browser Default",
        value: "default",
    },
    {
        name: "Average Pooling",
        value: "avgPooling",
    },
    {
        name: "Dual Min Max Pooling",
        value: "dualMinMaxPooling",
    },
    {
        name: "Min Pooling",
        value: "minPooling",
    },
    {
        name: "Max Pooling",
        value: "maxPooling",
    },
];
INTERPOLATION_ALGORITHMS.forEach((algorithm) => {
    const option = document.createElement("a");
    option.className = "dropdown-item btndropMenu";
    option.textContent = algorithm.name;
    option.value = algorithm.value;
    option.addEventListener("click", () => {
        document.getElementById("interpolation-algorithm-button").innerHTML = algorithm.name;
        selectedInterpolationAlgorithm = algorithm.value;
        runStep2();
    });
    document.getElementById("interpolation-algorithm-options").appendChild(option);
});

function d3ColorDistanceWrapper(d3DistanceFunction) {
    return (c1, c2) =>
        d3DistanceFunction(d3.color(rgbToHex(c1[0], c1[1], c1[2])), d3.color(rgbToHex(c2[0], c2[1], c2[2])));
}

function RGBPixelDistanceSquared(pixel1, pixel2) {
    let sum = 0;
    for (let i = 0; i < 3; i++) {
        sum += Math.abs(pixel1[i] - pixel2[i]);
    }
    return sum;
}

const colorDistanceFunctionsInfo = {
    euclideanRGB: {
        name: "Simple (RGB)",
        func: RGBPixelDistanceSquared,
    },
    euclideanLAB: {
        name: "Enhanced (LAB)",
        func: d3ColorDistanceWrapper(d3.differenceEuclideanLab),
    },
    // HCL and HSL don't always work
    // euclideanHCL: {
    //     name: "Euclidean HCL",
    //     func: d3ColorDistanceWrapper(d3.differenceEuclideanHCL)
    // },
    // euclideanHSL: {
    //     name: "Euclidean HSL",
    //     func: d3ColorDistanceWrapper(d3.differenceEuclideanHSL)
    // },
    // CMC sometimes looks odd (symmetry issues?)
    // cmc: {
    //     name: "CMC",
    //     func: d3ColorDistanceWrapper(d3.differenceCmc)
    // },
    cie94: {
        name: "Accurate (CIE94)",
        func: d3ColorDistanceWrapper(d3.differenceCie94),
    },
    ciede2000: {
        name: "Very Accurate (CIEDE2000)",
        func: d3ColorDistanceWrapper(d3.differenceCiede2000),
    },
    din99o: {
        name: "Experimental (DIN99o)",
        func: d3ColorDistanceWrapper(d3.differenceDin99o),
    },
};

const defaultDistanceFunctionKey = "ciede2000";
let colorDistanceFunction = colorDistanceFunctionsInfo[defaultDistanceFunctionKey].func;
document.getElementById("distance-function-button").innerHTML =
    colorDistanceFunctionsInfo[defaultDistanceFunctionKey].name;

Object.keys(colorDistanceFunctionsInfo).forEach((key) => {
    const distanceFunction = colorDistanceFunctionsInfo[key];
    const option = document.createElement("a");
    option.className = "dropdown-item btndropMenu3";
    option.textContent = distanceFunction.name;
    option.value = key;
    option.addEventListener("click", () => {
        document.getElementById("distance-function-button").innerHTML = distanceFunction.name;
        colorDistanceFunction = distanceFunction.func;
        disableInteraction();
        runStep3();
    });
    document.getElementById("distance-function-options").appendChild(option);
});

Object.keys(quantizationAlgorithmsInfo).forEach((key) => {
    const algorithm = quantizationAlgorithmsInfo[key];
    const option = document.createElement("a");
    option.className = "dropdown-item btndropMenu";
    option.textContent = algorithm.name;
    option.value = key;
    option.addEventListener("click", () => {
        document.getElementById("quantization-algorithm-button").innerHTML = algorithm.name;
        quantizationAlgorithm = key;

        document.getElementById("color-ties-resolution-section").hidden = quantizationAlgorithm != "twoPhase";

        const isTraditionalErrorDithering = Object.keys(quantizationAlgorithmToTraditionalDitheringKernel).includes(
            quantizationAlgorithm
        );
        [...document.getElementsByClassName("traditional-dithering-algorithm-warning")].forEach(
            (item) => (item.hidden = !isTraditionalErrorDithering)
        );
        disableInteraction();
        runStep3();
    });

});

constMixInDivider = document.createElement("div");
constMixInDivider.className = "dropdown-divider";


const importOption = document.createElement("a");
importOption.className = "dropdown-item btn";
importOption.textContent = "Import From File";
importOption.value = null;
importOption.addEventListener("click", () => {
    document.getElementById("import-stud-map-file-input").click();
});

function getColorSquare(hex) {
    const result = document.createElement("div");
    result.style.backgroundColor = hex;
    result.style.width = "1em";
    result.style.height = "1em";
    return result;
}

function getColorSelectorDropdown(tooltipPosition) {
    if (!tooltipPosition) {
        tooltipPosition = "left";
    }

    const container = document.createElement("div");
    const id = "color-selector" + uuidv4();

    const button = document.createElement("button");
    button.className = "btn btn-outline-secondary";
    button.type = "button";
    button.setAttribute("data-toggle", "dropdown");
    button.setAttribute("aria-haspopup", "true");
    button.setAttribute("aria-expanded", "false");
    button.id = id;
    button.appendChild(getColorSquare(DEFAULT_COLOR));
    button.value = DEFAULT_COLOR;

    const dropdown = document.createElement("div");
    dropdown.setAttribute("aria-labelledby", id);
    dropdown.className = "dropdown-menu pre-scrollable";

    ALL_VALID_BRICKLINK_COLORS.forEach((color) => {
        const option = document.createElement("a");
        option.style.display = "flex";
        option.className = "dropdown-item btn3";

        const text = document.createElement("span");
        text.innerHTML = "&nbsp;" + color.name;

        const colorSquare = getColorSquare(color.hex);
        colorSquare.style.marginTop = "3px";

        option.appendChild(colorSquare);
        option.appendChild(text);

        option.addEventListener("click", () => {
            button.innerHTML = "";
            button.appendChild(getColorSquare(color.hex));
            container.setAttribute("title", color.name);
            $('[data-toggle="tooltip"]').tooltip("dispose");
            $('[data-toggle="tooltip"]').tooltip();

            activePaintbrushHex = color.hex;
            console.log("Wybrano kolor:", activePaintbrushHex);
        });

        dropdown.appendChild(option);
    });

    container.setAttribute("data-toggle", "tooltip");
    container.setAttribute("data-placement", tooltipPosition);
    container.setAttribute("title", DEFAULT_COLOR_NAME);

    setTimeout(() => $('[data-toggle="tooltip"]').tooltip(), 10);

    container.appendChild(button);
    container.appendChild(dropdown);

    return container;
}

const colorDropdownContainer = document.getElementById("paintbrush-controls");
colorDropdownContainer.appendChild(getColorSelectorDropdown("left"));

function createDynamicPaintColorGrid() {
    const container = document.getElementById("paintbrush-controls");
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.classList.add("paint-color-grid"); 

    ALL_VALID_BRICKLINK_COLORS.forEach((color) => {
        const tile = document.createElement("div");
        tile.classList.add("paint-color-tile");
        tile.style.backgroundColor = color.hex;
        tile.title = color.name;

        tile.addEventListener("click", () => {
  
            grid.querySelectorAll(".paint-color-tile").forEach(el => el.classList.remove("active"));

            tile.classList.add("active");


            activePaintbrushHex = color.hex;
            console.log("🎨 Wybrano kolor pędzla:", activePaintbrushHex);
        });

        grid.appendChild(tile);
    });

    container.appendChild(grid);
}
createDynamicPaintColorGrid();


const onHueChange = () => {
    document.getElementById("hue-text").innerHTML = document.getElementById("hue-slider").value + "<span>&#176;</span>";
    runStep2();
};
document.getElementById("hue-slider").addEventListener("change", onHueChange, false);
document.getElementById("hue-increment").addEventListener(
    "click",
    () => {
        if (Number(document.getElementById("hue-slider").value) < Number(document.getElementById("hue-slider").max)) {
            document.getElementById("hue-slider").value = Number(document.getElementById("hue-slider").value) + 1;
            onHueChange();
        }
    },
    false
);
document.getElementById("hue-decrement").addEventListener(
    "click",
    () => {
        if (Number(document.getElementById("hue-slider").value) > Number(document.getElementById("hue-slider").min)) {
            document.getElementById("hue-slider").value = Number(document.getElementById("hue-slider").value) - 1;
            onHueChange();
        }
    },
    false
);

const onSaturationChange = () => {
    document.getElementById("saturation-text").innerHTML = document.getElementById("saturation-slider").value + "%";
    runStep2();
};
document.getElementById("saturation-slider").addEventListener("change", onSaturationChange, false);
document.getElementById("saturation-increment").addEventListener(
    "click",
    () => {
        if (
            Number(document.getElementById("saturation-slider").value) <
            Number(document.getElementById("saturation-slider").max)
        ) {
            document.getElementById("saturation-slider").value =
                Number(document.getElementById("saturation-slider").value) + 1;
            onSaturationChange();
        }
    },
    false
);
document.getElementById("saturation-decrement").addEventListener(
    "click",
    () => {
        if (
            Number(document.getElementById("saturation-slider").value) >
            Number(document.getElementById("saturation-slider").min)
        ) {
            document.getElementById("saturation-slider").value =
                Number(document.getElementById("saturation-slider").value) - 1;
            onSaturationChange();
        }
    },
    false
);

const onValueChange = () => {
    document.getElementById("value-text").innerHTML = document.getElementById("value-slider").value + "%";
    runStep2();
};
document.getElementById("value-slider").addEventListener("change", onValueChange, false);
document.getElementById("value-increment").addEventListener(
    "click",
    () => {
        if (
            Number(document.getElementById("value-slider").value) < Number(document.getElementById("value-slider").max)
        ) {
            document.getElementById("value-slider").value = Number(document.getElementById("value-slider").value) + 1;
            onValueChange();
        }
    },
    false
);
document.getElementById("value-decrement").addEventListener(
    "click",
    () => {
        if (
            Number(document.getElementById("value-slider").value) > Number(document.getElementById("value-slider").min)
        ) {
            document.getElementById("value-slider").value = Number(document.getElementById("value-slider").value) - 1;
            onValueChange();
        }
    },
    false
);

const onBrightnessChange = () => {
    document.getElementById("brightness-text").innerHTML =
        (document.getElementById("brightness-slider").value > 0 ? "+" : "") +
        document.getElementById("brightness-slider").value;
    runStep2();
};
document.getElementById("brightness-slider").addEventListener("change", onBrightnessChange, false);
document.getElementById("brightness-increment").addEventListener(
    "click",
    () => {
        if (
            Number(document.getElementById("brightness-slider").value) <
            Number(document.getElementById("brightness-slider").max)
        ) {
            document.getElementById("brightness-slider").value =
                Number(document.getElementById("brightness-slider").value) + 1;
            onBrightnessChange();
        }
    },
    false
);
document.getElementById("brightness-decrement").addEventListener(
    "click",
    () => {
        if (
            Number(document.getElementById("brightness-slider").value) >
            Number(document.getElementById("brightness-slider").min)
        ) {
            document.getElementById("brightness-slider").value =
                Number(document.getElementById("brightness-slider").value) - 1;
            onBrightnessChange();
        }
    },
    false
);

const onContrastChange = () => {
    document.getElementById("contrast-text").innerHTML =
        (document.getElementById("contrast-slider").value > 0 ? "+" : "") +
        document.getElementById("contrast-slider").value;
    runStep2();
};
document.getElementById("contrast-slider").addEventListener("change", onContrastChange, false);
document.getElementById("contrast-increment").addEventListener(
    "click",
    () => {
        if (
            Number(document.getElementById("contrast-slider").value) <
            Number(document.getElementById("contrast-slider").max)
        ) {
            document.getElementById("contrast-slider").value =
                Number(document.getElementById("contrast-slider").value) + 1;
            onContrastChange();
        }
    },
    false
);
document.getElementById("contrast-decrement").addEventListener(
    "click",
    () => {
        if (
            Number(document.getElementById("contrast-slider").value) >
            Number(document.getElementById("contrast-slider").min)
        ) {
            document.getElementById("contrast-slider").value =
                Number(document.getElementById("contrast-slider").value) - 1;
            onContrastChange();
        }
    },
    false
);



document.getElementById("reset-hsv-button").addEventListener(
    "click",
    () => {
        document.getElementById("hue-slider").value = 0;
        document.getElementById("saturation-slider").value = 0;
        document.getElementById("value-slider").value = 0;
        document.getElementById("hue-text").innerHTML =
            document.getElementById("hue-slider").value + "<span>&#176;</span>";
        document.getElementById("saturation-text").innerHTML = document.getElementById("saturation-slider").value + "%";
        document.getElementById("value-text").innerHTML = document.getElementById("value-slider").value + "%";
        runStep2();
    },
    false
);

document.getElementById("reset-brightness-button").addEventListener(
    "click",
    () => {
        document.getElementById("brightness-slider").value = 0;
        document.getElementById("brightness-text").innerHTML = document.getElementById("brightness-slider").value;
        runStep2();
    },
    false
);

document.getElementById("reset-contrast-button").addEventListener(
    "click",
    () => {
        document.getElementById("contrast-slider").value = 0;
        document.getElementById("contrast-text").innerHTML = document.getElementById("contrast-slider").value;
        runStep2();
    },
    false
);

function runStep1() {
    disableInteraction();
   
    setTimeout(() => {
        runStep2();
    }, 1);
}

function runStep2() {
    let inputPixelArray;
    if (selectedInterpolationAlgorithm === "default") {
        const croppedCanvas = inputImageCropper.getCroppedCanvas({
            width: targetResolution[0],
            height: targetResolution[1],
            maxWidth: 4096,
            maxHeight: 4096,
            imageSmoothingEnabled: false,
        });
        inputPixelArray = getPixelArrayFromCanvas(croppedCanvas);
    } else {
        const croppedCanvas = inputImageCropper.getCroppedCanvas({
            maxWidth: 4096,
            maxHeight: 4096,
            imageSmoothingEnabled: false,
        });
        rawCroppedData = getPixelArrayFromCanvas(croppedCanvas);
        let subArrayPoolingFunction;
        if (selectedInterpolationAlgorithm === "maxPooling") {
            subArrayPoolingFunction = maxPoolingKernel;
        } else if (selectedInterpolationAlgorithm === "minPooling") {
            subArrayPoolingFunction = minPoolingKernel;
        } else if (selectedInterpolationAlgorithm === "avgPooling") {
            subArrayPoolingFunction = avgPoolingKernel;
        } else {
           
            subArrayPoolingFunction = dualMinMaxPoolingKernel;
        }
        inputPixelArray = resizeImagePixelsWithAdaptivePooling(
            rawCroppedData,
            croppedCanvas.width,
            targetResolution[0],
            targetResolution[1],
            subArrayPoolingFunction
        );
    }
    let filteredPixelArray = applyHSVAdjustment(
        inputPixelArray,
        document.getElementById("hue-slider").value,
        document.getElementById("saturation-slider").value / 100,
        document.getElementById("value-slider").value / 100
    );
    filteredPixelArray = applyBrightnessAdjustment(
        filteredPixelArray,
        Number(document.getElementById("brightness-slider").value)
    );
    filteredPixelArray = applyContrastAdjustment(
        filteredPixelArray,
        Number(document.getElementById("contrast-slider").value)
    );
    step2Canvas.width = targetResolution[0];
    step2Canvas.height = targetResolution[1];
    drawPixelsOnCanvas(filteredPixelArray, step2Canvas);


    const cropperData = inputImageCropper.getData();
    
    const cropperBufferCanvas = document.getElementById("step-2-depth-canvas-cropper-buffer");
    

    setTimeout(() => {
        runStep3();
        step2CanvasUpscaled.width = targetResolution[0] * SCALING_FACTOR;
        step2CanvasUpscaled.height = targetResolution[1] * SCALING_FACTOR;
        step2CanvasUpscaledContext.imageSmoothingEnabled = false;
        step2CanvasUpscaledContext.drawImage(
            step2Canvas,
            0,
            0,
            targetResolution[0] * SCALING_FACTOR,
            targetResolution[1] * SCALING_FACTOR
        );
       
    }, 1);
}

function getVariablePixelAvailablePartDimensions() {
    const availableParts = [...document.getElementById("pixel-dimensions-container").children]
        .map((div) => div.children[0])
        .map((label) => label.children[0])
        .filter((input) => input.checked)
        .filter((input) => {
            const className = input.className;
            const uniqueVariablePixelName = selectedPixelPartNumber.replace("variable_", "");
            return className.includes(uniqueVariablePixelName);
        })
        .map((input) => input.name)
        .map((part) => part.split(PLATE_DIMENSIONS_DEPTH_SEPERATOR).map((dimension) => Number(dimension)));
    const flippedParts = [];
    availableParts.forEach((part) => {
        if (part[0] !== part[1]) {
            flippedParts.push([part[1], part[0]]);
        }
    });
    flippedParts.forEach((part) => availableParts.push(part));
    return availableParts;
}

let step3VariablePixelPieceDimensions = null;

function runStep3() {
    const fiteredPixelArray = getPixelArrayFromCanvas(step2Canvas);

    let alignedPixelArray;

    if (quantizationAlgorithm === "twoPhase") {
        alignedPixelArray = alignPixelsToStudMap(
            fiteredPixelArray,
            isBleedthroughEnabled() ? getDarkenedStudMap(selectedStudMap) : selectedStudMap,
            colorDistanceFunction
        );
    } else if (quantizationAlgorithm === "greedy" || quantizationAlgorithm === "greedyWithDithering") {
        alignedPixelArray = correctPixelsForAvailableStudsWithGreedyDynamicDithering(
            isBleedthroughEnabled() ? getDarkenedStudMap(selectedStudMap) : selectedStudMap,
            fiteredPixelArray,
            targetResolution[0],
            colorDistanceFunction,
            quantizationAlgorithm !== "greedyWithDithering", 
            true 
        );
    } else {
        const ditheringKernel = quantizationAlgorithmToTraditionalDitheringKernel[quantizationAlgorithm];
        alignedPixelArray = alignPixelsWithTraditionalDithering(
            isBleedthroughEnabled() ? getDarkenedStudMap(selectedStudMap) : selectedStudMap,
            fiteredPixelArray,
            targetResolution[0],
            colorDistanceFunction,
            ditheringKernel
        );
    }

    step3PixelArrayForEraser = alignedPixelArray;
    alignedPixelArray = getArrayWithOverridesApplied(
        alignedPixelArray,
        isBleedthroughEnabled() ? getDarkenedImage(overridePixelArray) : overridePixelArray
    );

    

    if (("" + selectedPixelPartNumber).match("^variable.*$")) {
        const alignedPixelMatrix = convertPixelArrayToMatrix(alignedPixelArray, targetResolution[0]);
        step3VariablePixelPieceDimensions = new Array();
        for (let i = 0; i < targetResolution[1]; i++) {
            step3VariablePixelPieceDimensions.push([]);
            step3VariablePixelPieceDimensions[i] = [];
            for (let j = 0; j < targetResolution[0]; j++) {
                step3VariablePixelPieceDimensions[i].push(null);
            }
        }
        const uniqueColors = Object.keys(getUsedPixelsStudMap(alignedPixelArray));
        const availableParts = getVariablePixelAvailablePartDimensions();
        for (
            let depthLevel = 0;
            depthLevel < Number(document.getElementById("num-depth-levels-slider").value);
            depthLevel++
        ) {
            uniqueColors.forEach((colorHex) => {
                const colorRGB = hexToRgb(colorHex);
                const setPixelMatrix = getSetPixelMatrixFromInputMatrix(alignedPixelMatrix, (p, i, j) => {
                    return !(
                        (!depthEnabled || depthLevel === adjustedDepthPixelArray[4 * (i * targetResolution[0] + j)]) &&
                        p[0] === colorRGB[0] &&
                        p[1] === colorRGB[1] &&
                        p[2] === colorRGB[2]
                    );
                });
                const requiredPartMatrix = getRequiredPartMatrixFromSetPixelMatrix(
                    setPixelMatrix,
                    availableParts,
                    PLATE_WIDTH
                );
                requiredPartMatrix.forEach((row, i) => {
                    row.forEach((entry, j) => {
                        step3VariablePixelPieceDimensions[i][j] = step3VariablePixelPieceDimensions[i][j] || entry;
                    });
                });
            });
        }
    } else {
        step3VariablePixelPieceDimensions = null;
    }

    step3Canvas.width = targetResolution[0];
    step3Canvas.height = targetResolution[1];
    drawPixelsOnCanvas(alignedPixelArray, step3Canvas);

    step3CanvasPixelsForHover = isBleedthroughEnabled()
        ? revertDarkenedImage(
              alignedPixelArray,
              getDarkenedStudsToStuds(ALL_BRICKLINK_SOLID_COLORS.map((color) => color.hex))
          )
        : alignedPixelArray;
   

    setTimeout(() => {
        if (!isStep3ViewExpanded) {
            runStep4();
        } else {
            enableInteraction();
        }
        step3CanvasUpscaledContext.imageSmoothingEnabled = false;
        drawStudImageOnCanvas(
            isBleedthroughEnabled()
                ? revertDarkenedImage(
                      alignedPixelArray,
                      getDarkenedStudsToStuds(ALL_BRICKLINK_SOLID_COLORS.map((color) => color.hex))
                  )
                : alignedPixelArray,
            targetResolution[0],
            SCALING_FACTOR,
            step3CanvasUpscaled,
            selectedPixelPartNumber,
            step3VariablePixelPieceDimensions
        );
       
    }, 1); // TODO: find better way to check that input is finished
}
const toggleButton = document.getElementById("toggle-expansion-button");

toggleButton.addEventListener("click", () => {
    isStep3ViewExpanded = !isStep3ViewExpanded;
    const toToggleElements = Array.from(document.getElementsByClassName("hide-on-step-3-expansion"));
    toToggleElements.forEach((element) => (element.hidden = isStep3ViewExpanded));
    toggleButton.title = isStep3ViewExpanded ? "Collapse picture" : "Expand picture";
    document.getElementById("step-3").className = isStep3ViewExpanded ? "step-3-fullscreen" : "step";
    document.getElementById("expand-picture-svg").hidden = isStep3ViewExpanded;
    document.getElementById("collapse-picture-svg").hidden = !isStep3ViewExpanded;
    $('[data-toggle="tooltip"]').tooltip("dispose");
    $('[data-toggle="tooltip"]').tooltip();
});


function onCherryPickColor(row, col) {
    const pixelIndex = 4 * (row * targetResolution[0] + col);
    const isOverridden =
        overridePixelArray[pixelIndex] !== null &&
        overridePixelArray[pixelIndex + 1] !== null &&
        overridePixelArray[pixelIndex + 2] !== null;

    const step3PixelArray = isBleedthroughEnabled()
        ? revertDarkenedImage(
            getPixelArrayFromCanvas(step3Canvas),
            getDarkenedStudsToStuds(ALL_BRICKLINK_SOLID_COLORS.map((color) => color.hex))
        )
        : getPixelArrayFromCanvas(step3Canvas);

    const colorHex = isOverridden
        ? rgbToHex(
            overridePixelArray[pixelIndex],
            overridePixelArray[pixelIndex + 1],
            overridePixelArray[pixelIndex + 2]
        )
        : rgbToHex(
            step3PixelArray[pixelIndex],
            step3PixelArray[pixelIndex + 1],
            step3PixelArray[pixelIndex + 2]
        );

    const colorTiles = document.querySelectorAll(".paint-color-tile");
    colorTiles.forEach(tile => {
        const tileColor = window.getComputedStyle(tile).backgroundColor;
        if (tileColor && rgbStringToHex(tileColor) === colorHex.toUpperCase()) {
            tile.classList.add("active");
        } else {
            tile.classList.remove("active");
        }
    });

    activePaintbrushHex = colorHex;

    selectedPaintbrushTool = "paintbrush-tool-dropdown-option";
    const dropdownButton = document.getElementById("paintbrush-tool-selection-dropdown");
    const brushOption = document.getElementById("paintbrush-tool-dropdown-option");
    const text = brushOption.textContent.trim();

    dropdownButton.innerHTML = "";
    const textSpan = document.createElement("span");
    textSpan.className = "dropdown-text";
    textSpan.textContent = text;
    dropdownButton.appendChild(textSpan);
}

function rgbStringToHex(rgbString) {
    const match = rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return null;
    const r = parseInt(match[1]).toString(16).padStart(2, "0");
    const g = parseInt(match[2]).toString(16).padStart(2, "0");
    const b = parseInt(match[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`.toUpperCase();
}
function rgbStringToHex(rgbString) {
    const match = rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return null;
    const r = parseInt(match[1]).toString(16).padStart(2, "0");
    const g = parseInt(match[2]).toString(16).padStart(2, "0");
    const b = parseInt(match[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`.toUpperCase();
}

let isStep3ViewExpanded = false;
let activePaintbrushHex = null; 
let isMouseDown = false;       
let step3CanvasHoveredPixel = null;
let selectedPaintbrushTool = "paintbrush-tool-dropdown-option";
const dropdownButton = document.getElementById("paintbrush-tool-selection-dropdown");
const dropdownOptions = document.getElementById("paintbrush-tool-selection-dropdown-options");

Array.from(dropdownOptions.children).forEach((item) => {
    const value = item.id;
    item.addEventListener("click", () => {
        selectedPaintbrushTool = value;
        const text = item.textContent.trim();
        dropdownButton.innerHTML = "";
        const textSpan = document.createElement("span");
        textSpan.className = "dropdown-text";
        textSpan.textContent = text;
        dropdownButton.appendChild(textSpan);
        const colorDropdown = document.getElementById("paintbrush-color-dropdown");
        if (colorDropdown) {
            colorDropdown.disabled = value !== "paintbrush-tool-dropdown-option";
        }
    });
});


function onMouseMoveOverStep3Canvas(event) {
    if (!document.getElementById("universal-loading-progress").hidden) return;

    const rawRow =
        event.clientY - step3CanvasUpscaled.getBoundingClientRect().y - step3CanvasUpscaled.offsetHeight / targetResolution[1] / 2;
    const rawCol =
        event.clientX - step3CanvasUpscaled.getBoundingClientRect().x - step3CanvasUpscaled.offsetWidth / targetResolution[0] / 2;
    const row = Math.round((rawRow * targetResolution[1]) / step3CanvasUpscaled.offsetHeight);
    const col = Math.round((rawCol * targetResolution[0]) / step3CanvasUpscaled.offsetWidth);

    const pixelIndex = 4 * (row * targetResolution[0] + col);
    const i = pixelIndex / 4;
    const ctx = step3CanvasUpscaledContext;
    const width = targetResolution[0];
    const radius = SCALING_FACTOR / 2;

    if (isMouseDown) {
        if (selectedPaintbrushTool === "paintbrush-tool-dropdown-option" && activePaintbrushHex) {

            /*const colorRGB = hexToRgb(activePaintbrushHex);
            ctx.beginPath();
            ctx.arc(((i % width) * 2 + 1) * radius, (Math.floor(i / width) * 2 + 1) * radius, radius, 0, 2 * Math.PI);
            ctx.fillStyle = activePaintbrushHex;
            ctx.fill();

            overridePixelArray[pixelIndex] = colorRGB[0];
            overridePixelArray[pixelIndex + 1] = colorRGB[1];
            overridePixelArray[pixelIndex + 2] = colorRGB[2];*/

            const colorRGB = hexToRgb(activePaintbrushHex);
            // we want to paint - update the override pixel array
            // do stuff directly on the canvas for perf
            ctx.beginPath();
            ctx.arc(((i % width) * 2 + 1) * radius, (Math.floor(i / width) * 2 + 1) * radius, radius, 0, 2 * Math.PI);
            ctx.fillStyle = activePaintbrushHex;
            ctx.fill();

            // update the override pixel array in place
            overridePixelArray[pixelIndex] = colorRGB[0];
            overridePixelArray[pixelIndex + 1] = colorRGB[1];
            overridePixelArray[pixelIndex + 2] = colorRGB[2];

        } else if (selectedPaintbrushTool === "eraser-tool-dropdown-option") {
            if (
                overridePixelArray[pixelIndex] != null &&
                overridePixelArray[pixelIndex + 1] != null &&
                overridePixelArray[pixelIndex + 2] != null
            ) {
                // do stuff directly on the canvas for perf
                ctx.beginPath();
                ctx.arc(
                    ((i % width) * 2 + 1) * radius,
                    (Math.floor(i / width) * 2 + 1) * radius,
                    radius,
                    0,
                    2 * Math.PI
                );
                ctx.fillStyle = rgbToHex(
                    step3PixelArrayForEraser[pixelIndex],
                    step3PixelArrayForEraser[pixelIndex + 1],
                    step3PixelArrayForEraser[pixelIndex + 2]
                );
                ctx.fill();

                // update the override pixel array in place
                overridePixelArray[pixelIndex] = null;
                overridePixelArray[pixelIndex + 1] = null;
                overridePixelArray[pixelIndex + 2] = null;
            }
        } else {
            onCherryPickColor(row, col);
        }
    } else if (pixelIndex + 2 < step3CanvasPixelsForHover.length) {
        /*// we're not painting - highlight the pixel instead
        const hoveredPixelRGB = [
            step3CanvasPixelsForHover[pixelIndex],
            step3CanvasPixelsForHover[pixelIndex + 1],
            step3CanvasPixelsForHover[pixelIndex + 2],
        ];
        const hoveredPixelHex = rgbToHex(hoveredPixelRGB[0], hoveredPixelRGB[1], hoveredPixelRGB[2]);
        ctx.beginPath();
        ctx.arc(((i % width) * 2 + 1) * radius, (Math.floor(i / width) * 2 + 1) * radius, radius / 2, 0, 2 * Math.PI);
        ctx.fillStyle = inverseHex(hoveredPixelHex);
        ctx.fill();*/

        // we're not painting - highlight the pixel instead
        const hoveredPixelRGB = [
            step3CanvasPixelsForHover[pixelIndex],
            step3CanvasPixelsForHover[pixelIndex + 1],
            step3CanvasPixelsForHover[pixelIndex + 2],
        ];
        const hoveredPixelHex = rgbToHex(hoveredPixelRGB[0], hoveredPixelRGB[1], hoveredPixelRGB[2]);
        ctx.beginPath();
        ctx.arc(((i % width) * 2 + 1) * radius, (Math.floor(i / width) * 2 + 1) * radius, radius / 2, 0, 2 * Math.PI);
        ctx.fillStyle = inverseHex(hoveredPixelHex);
        ctx.fill();

    }

    if (step3CanvasHoveredPixel != null && (step3CanvasHoveredPixel[0] !== row || step3CanvasHoveredPixel[1] !== col)) {
        // Clear out old highlight
        const i = step3CanvasHoveredPixel[0] * width + step3CanvasHoveredPixel[1];
        const pixelIndex = i * 4;

        ctx.beginPath();
        ctx.arc(((i % width) * 2 + 1) * radius, (Math.floor(i / width) * 2 + 1) * radius, radius / 2, 0, 2 * Math.PI);

        let originalPixelRGB = [
            overridePixelArray[pixelIndex] || step3CanvasPixelsForHover[pixelIndex],
            overridePixelArray[pixelIndex + 1] || step3CanvasPixelsForHover[pixelIndex + 1],
            overridePixelArray[pixelIndex + 2] || step3CanvasPixelsForHover[pixelIndex + 2],
        ];
        const originalPixelHex = rgbToHex(originalPixelRGB[0], originalPixelRGB[1], originalPixelRGB[2]);

        ctx.fillStyle = originalPixelHex;
        ctx.fill();
    }
    step3CanvasHoveredPixel = [row, col];
}

step3CanvasUpscaled.addEventListener("mousedown", (event) => {
    const isToolSelected =
        (selectedPaintbrushTool === "paintbrush-tool-dropdown-option" && activePaintbrushHex) ||
        selectedPaintbrushTool === "eraser-tool-dropdown-option" ||
        selectedPaintbrushTool === "dropdown-tool-dropdown-option"; 

    if (!isToolSelected) {
        alert("Wybierz najpierw kolor pędzla lub narzędzie gumki! 🎨");
        return;
    }

    isMouseDown = true;
    onMouseMoveOverStep3Canvas(event);
});

step3CanvasUpscaled.addEventListener("mouseup", () => {
    isMouseDown = false;
    runStep3();
});

step3CanvasUpscaled.addEventListener("mouseleave", () => {
    isMouseDown = false;
    step3CanvasHoveredPixel = null;
    runStep3();
});

step3CanvasUpscaled.addEventListener("mousemove", (event) => {
   // if (!isMouseDown) return;
    onMouseMoveOverStep3Canvas(event);
});

step3CanvasUpscaled.addEventListener(
    "touchend",
    function (e) {
        const mouseEvent = new MouseEvent("mouseup", {});
        step3CanvasUpscaled.dispatchEvent(mouseEvent);
    },
    false
);

document.querySelectorAll("canvas").forEach((c) => {
    c.addEventListener("contextmenu", (e) => e.preventDefault());
});





step3CanvasUpscaled.addEventListener(
    "touchmove",
    function (e) {
        e.preventDefault();
        if (!isTouchInBounds) {
            return;
        }
        const { clientX, clientY } = e.touches[0];

        let mouseEventType = "mousemove";
        if (step3CanvasUpscaled !== document.elementFromPoint(clientX, clientY)) {
            isTouchInBounds = false;
            mouseEventType = "mouseleave";
        }
        const mouseEvent = new MouseEvent(mouseEventType, {
            clientX,
            clientY,
        });
        step3CanvasUpscaled.dispatchEvent(mouseEvent);
    },
    false
);


window.depthPreviewOptions = {};
function runStep4(asyncCallback) {
    const step2PixelArray = getPixelArrayFromCanvas(step2Canvas);
    const step3PixelArray = getPixelArrayFromCanvas(step3Canvas);
    step4Canvas.width = 0;
    try {
        bricklinkCacheCanvas.width = targetResolution[0];
        bricklinkCacheCanvas.height = targetResolution[1];
        step4Canvas.width = targetResolution[0];
        step4Canvas.height = targetResolution[1];
        step4CanvasContext.clearRect(0, 0, targetResolution[0], targetResolution[1]);
        step4CanvasUpscaledContext.clearRect(
            0,
            0,
            targetResolution[0] * SCALING_FACTOR,
            targetResolution[1] * SCALING_FACTOR
        );

        let shouldSideStepStep4 = true;
        Object.values(selectedStudMap).forEach((count) => {
            if (count < targetResolution[0] * targetResolution[1]) {
                shouldSideStepStep4 = false;
            }
        });

        shouldSideStepStep4 =
            shouldSideStepStep4 ||
            document.getElementById("infinite-piece-count-check").checked ||
            Object.keys(quantizationAlgorithmToTraditionalDitheringKernel).includes(quantizationAlgorithm) ||
            ("" + selectedPixelPartNumber).match("^variable.*$");

        if (!shouldSideStepStep4) {
            const requiredStuds = targetResolution[0] * targetResolution[1];
            let availableStuds = 0;
            Array.from(customStudTableBody.children).forEach((stud) => {
                availableStuds += parseInt(stud.children[1].children[0].children[0].value);
            });
            const missingStuds = Math.max(requiredStuds - availableStuds, 0);
            if (missingStuds > 0) {
                throw "Step 4 failed";
            }
        }

        let availabilityCorrectedPixelArray;

        if (shouldSideStepStep4) {
            availabilityCorrectedPixelArray = step3PixelArray;
        } else if (quantizationAlgorithm === "twoPhase") {
            availabilityCorrectedPixelArray = correctPixelsForAvailableStuds(
                step3PixelArray,
                isBleedthroughEnabled() ? getDarkenedStudMap(selectedStudMap) : selectedStudMap,
                step2PixelArray,
                isBleedthroughEnabled() ? getDarkenedImage(overridePixelArray) : overridePixelArray,
                selectedTiebreakTechnique,
                document.getElementById("color-tie-grouping-factor-slider").value,
                targetResolution[0],
                colorDistanceFunction
            );
        } else {
            
            availabilityCorrectedPixelArray = correctPixelsForAvailableStudsWithGreedyDynamicDithering(
                isBleedthroughEnabled() ? getDarkenedStudMap(selectedStudMap) : selectedStudMap,
                getArrayWithOverridesApplied(
                    step2PixelArray,
                    isBleedthroughEnabled() ? getDarkenedImage(overridePixelArray) : overridePixelArray
                ),
                targetResolution[0],
                colorDistanceFunction,
                quantizationAlgorithm !== "greedyWithDithering",
                shouldSideStepStep4
            );
        }

        drawPixelsOnCanvas(availabilityCorrectedPixelArray, step4Canvas);


        setTimeout(async () => {
            step4CanvasUpscaledContext.imageSmoothingEnabled = false;
            const pixelsToDraw = isBleedthroughEnabled()
                ? revertDarkenedImage(
                      availabilityCorrectedPixelArray,
                      getDarkenedStudsToStuds(ALL_BRICKLINK_SOLID_COLORS.map((color) => color.hex))
                  )
                : availabilityCorrectedPixelArray;
            drawPixelsOnCanvas(pixelsToDraw, bricklinkCacheCanvas);

            drawStudImageOnCanvas(
                pixelsToDraw,
                targetResolution[0],
                SCALING_FACTOR,
                step4CanvasUpscaled,
                selectedPixelPartNumber,
                step3VariablePixelPieceDimensions
            );
            const usedPixelsStudMap = getUsedPixelsStudMap(pixelsToDraw);
            //const usedPixelsTableBody = document.getElementById("studs-used-table-body");
            //usedPixelsTableBody.innerHTML = "";
            const variablePixelsUsed = ("" + selectedPixelPartNumber).match("^variable.*$");
            //document.getElementById("pieces-used-dimensions-header").hidden = !variablePixelsUsed;
            let pieceCountsForTable = {}; 
            if (variablePixelsUsed) {
                const pixelMatrix = convertPixelArrayToMatrix(pixelsToDraw, targetResolution[0]);
                step3VariablePixelPieceDimensions.forEach((row, i) => {
                    row.forEach((pixelDimensions, j) => {
                        if (pixelDimensions != null) {
                            const pixelRGB = pixelMatrix[i][j];
                            const pixelHex = rgbToHex(pixelRGB[0], pixelRGB[1], pixelRGB[2]);
                            const sortedPixelDimensions =
                                pixelDimensions[0] < pixelDimensions[1]
                                    ? pixelDimensions
                                    : [pixelDimensions[1], pixelDimensions[0]];
                            studRowKey =
                                pixelHex +
                                "_" +
                                sortedPixelDimensions[0] +
                                PLATE_DIMENSIONS_DEPTH_SEPERATOR +
                                sortedPixelDimensions[1];
                            pieceCountsForTable[studRowKey] = (pieceCountsForTable[studRowKey] || 0) + 1;
                        }
                    });
                });
            } else {
                pieceCountsForTable = usedPixelsStudMap;
            }

            const usedColors = Object.keys(pieceCountsForTable);
            usedColors.sort();
            usedColors.forEach((keyString) => {
                const pieceKey = keyString.split("_");
                const color = pieceKey[0];
                const studRow = document.createElement("tr");
                studRow.style = "height: 1px;";

                const colorCell = document.createElement("td");
                const colorSquare = getColorSquare(color);
                colorCell.appendChild(colorSquare);
                const colorLabel = document.createElement("small");
                colorLabel.innerHTML = HEX_TO_COLOR_NAME[color] || color;
                colorCell.appendChild(colorLabel);
                studRow.appendChild(colorCell);

                if (pieceKey.length > 1) {
                    const dimensionsCell = document.createElement("td");
                    dimensionsCell.style = "height: inherit;";
                    const dimensionsCellChild = document.createElement("div");
                    dimensionsCellChild.style =
                        "height: 100%; display: flex; flex-direction:column; justify-content: center";
                    const dimensionsCellChild2 = document.createElement("div");
                    dimensionsCellChild2.style = "";
                    dimensionsCellChild2.innerHTML = pieceKey[1];

                    dimensionsCellChild.appendChild(dimensionsCellChild2);
                    dimensionsCell.appendChild(dimensionsCellChild);
                    studRow.appendChild(dimensionsCell);
                }

                const numberCell = document.createElement("td");
                numberCell.style = "height: inherit;";
                const numberCellChild = document.createElement("div");
                numberCellChild.style = "height: 100%; display: flex; flex-direction:column; justify-content: center";
                const numberCellChild2 = document.createElement("div");
                numberCellChild2.style = "";
                numberCellChild2.innerHTML = pieceCountsForTable[keyString];

                numberCellChild.appendChild(numberCellChild2);
                numberCell.appendChild(numberCellChild);
                studRow.appendChild(numberCell);
            });

          
            let missingPixelsExist = false;
            if (!shouldSideStepStep4) {
                const missingPixelsStudMap = studMapDifference(
                    getUsedPixelsStudMap(
                        isBleedthroughEnabled()
                            ? revertDarkenedImage(
                                  step3PixelArray,
                                  getDarkenedStudsToStuds(ALL_BRICKLINK_SOLID_COLORS.map((color) => color.hex))
                              )
                            : step3PixelArray
                    ),
                    selectedStudMap
                );
                const usedColors = Object.keys(missingPixelsStudMap);
                usedColors.sort();
                usedColors.forEach((color) => {
                    if (missingPixelsStudMap[color] > 0) {
                        missingPixelsExist = true;
                        const studRow = document.createElement("tr");
                        studRow.style = "height: 1px;";

                        const colorCell = document.createElement("td");
                        const colorSquare = getColorSquare(color);
                        colorCell.appendChild(colorSquare);
                        const colorLabel = document.createElement("small");
                        colorLabel.innerHTML = HEX_TO_COLOR_NAME[color] || color;
                        colorCell.appendChild(colorLabel);
                        studRow.appendChild(colorCell);

                        const numberCell = document.createElement("td");
                        numberCell.style = "height: inherit;";
                        const numberCellChild = document.createElement("div");
                        numberCellChild.style =
                            "height: 100%; display: flex; flex-direction:column; justify-content: center";
                        const numberCellChild2 = document.createElement("div");
                        numberCellChild2.style = "";
                        numberCellChild2.innerHTML = missingPixelsStudMap[color];

                        numberCellChild.appendChild(numberCellChild2);
                        numberCell.appendChild(numberCellChild);
                        studRow.appendChild(numberCell);

                        missingPixelsTableBody.appendChild(studRow);
                    }
                });
            }
         
            
            if (asyncCallback) {
                await asyncCallback();
            }
            enableInteraction();
            showMosaicSummary();
        }, 1); // TODO: find better way to check that input is finished
    } catch (_e) {
        enableInteraction();
        
    }
}

function getMosaicPrice(width, height, orientation = "square") {
    const sizeKey = `${width}x${height}`;
    const prices = {
        square: {
            "2x2": 449,
            "3x3": 899,
            "4x4": 1549,
            "5x5": 2349,
            "6x6": 3199,
            "7x7": 4199,
            "8x8": 5199,
            "9x9": 6299,
        },
        portrait: {
            "2x3": 649,
            "2x4": 849,
            "2x5": 1049,
            "2x6": 1199,
            "2x7": 1399,
            "2x8": 1549,
            "2x9": 1699,
            "3x4": 1199,
            "3x5": 1449,
            "3x6": 1699,
            "3x7": 1949,
            "3x8": 2249,
            "3x9": 2450,
            "4x5": 1849,
            "4x6": 2149,
            "4x7": 2449,
            "4x8": 2699,
            "4x9": 2949,
            "5x6": 2699,
            "5x7": 3099,
            "5x8": 3349,
            "5x9": 3749,
            "6x7": 3599,
            "6x8": 3999,
            "6x9": 4399,
            "7x8": 4649,
            "7x9": 5149,
            "8x9": 5699,
        },
        landscape: {
            "3x2": 649,
            "4x2": 849,
            "5x2": 1049,
            "6x2": 1199,
            "7x2": 1399,
            "8x2": 1549,
            "9x2": 1699,
            "4x3": 1199,
            "5x3": 1449,
            "6x3": 1699,
            "7x3": 1949,
            "8x3": 2249,
            "9x3": 2449,
            "5x4": 1849,
            "6x4": 2149,
            "7x4": 2449,
            "8x4": 2699,
            "9x4": 2949,
            "6x5": 2699,
            "7x5": 3099,
            "8x5": 3349,
            "9x5": 3749,
            "7x6": 3599,
            "8x6": 3999,
            "9x6": 4399,
            "8x7": 4649,
            "9x7": 5149,
            "9x8": 5699,
        },
    };

    return prices[orientation]?.[sizeKey] ?? "—";
}

function studsToDimensions(widthBaseplates, heightBaseplates) {
    const cmWidth = widthBaseplates * 12.8 + 1.6;
    const cmHeight = heightBaseplates * 12.8 + 1.6;
    const inchWidth = cmWidth / 2.54;
    const inchHeight = cmHeight / 2.54;
    return {
        cm: `${cmHeight.toFixed(1)} × ${cmWidth.toFixed(1)} cm`,
        inches: `${inchHeight.toFixed(1)} × ${inchWidth.toFixed(1)} in`
    };
}

function showMosaicSummary() {
    const width = targetResolution[0] / 16;
    const height = targetResolution[1] / 16;
    const orientation = width === height ? "square" : width > height ? "landscape" : "portrait";

    const pixels = getPixelArrayFromCanvas(step4Canvas);
    const usedColors = new Set();

    for (let i = 0; i < pixels.length; i += 4) {
        const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
        usedColors.add(rgbToHex(r, g, b));
    }

    const price = getMosaicPrice(width, height, orientation);
    const dims = studsToDimensions(width, height);

    document.getElementById("summary-colors").textContent = usedColors.size;
    document.getElementById("summary-size").textContent = `${width} × ${height} baseplates`;
    
    document.getElementById("summary-dimensions").textContent = `${dims.cm} (${dims.inches})`;

    document.getElementById("summary-price").textContent =
        price === "—" ? "N/A" : `${price.toFixed(2)} PLN`;

    document.getElementById("current-size").textContent = `${dims.cm} (${dims.inches})`
    document.getElementById("current-price").textContent =
        price === "—" ? "N/A" : `${price.toFixed(2)} PLN`;
}


const SERIALIZE_EDGE_LENGTH = 512;

function handleInputImage(e, dontClearDepth, dontLog) {
    const reader = new FileReader();
    reader.onload = function (event) {
        inputImage = new Image();
        inputImage.onload = function () {
            inputCanvas.width = SERIALIZE_EDGE_LENGTH;
            inputCanvas.height = SERIALIZE_EDGE_LENGTH;
            inputCanvasContext.drawImage(
                inputImage,
                0,
                0,
                inputImage.width,
                inputImage.height,
                0,
                0,
                SERIALIZE_EDGE_LENGTH,
                SERIALIZE_EDGE_LENGTH
            );

            const inputImagePixels = getPixelArrayFromCanvas(inputCanvas);
            for (var i = 3; i < inputImagePixels.length; i += 4) {
                inputImagePixels[i] = 255;
            }
            drawPixelsOnCanvas(inputImagePixels, inputCanvas);

            if (!dontClearDepth) {
                inputDepthCanvas.width = SERIALIZE_EDGE_LENGTH;
                inputDepthCanvas.height = SERIALIZE_EDGE_LENGTH;
                inputDepthCanvasContext.fillStyle = "black";
                inputDepthCanvasContext.fillRect(0, 0, inputDepthCanvas.width, inputDepthCanvas.height);
            }
        };
        inputImage.src = event.target.result;
        document.getElementById("app").hidden = false;
        document.getElementById("input-image-selector").innerHTML = "Reselect Input Image";
        document.getElementById("image-input-new").appendChild(document.getElementById("image-input"));
        document.getElementById("image-input-card").hidden = true;
        setTimeout(() => {
            step1CanvasUpscaled.width = SERIALIZE_EDGE_LENGTH;
            step1CanvasUpscaled.height = Math.floor((SERIALIZE_EDGE_LENGTH * inputImage.height) / inputImage.width);
            step1CanvasUpscaledContext.drawImage(
                inputCanvas,
                0,
                0,
                SERIALIZE_EDGE_LENGTH,
                SERIALIZE_EDGE_LENGTH,
                0,
                0,
                step1CanvasUpscaled.width,
                step1CanvasUpscaled.height
            );

            overridePixelArray = new Array(targetResolution[0] * targetResolution[1] * 4).fill(null);
            overrideDepthPixelArray = new Array(targetResolution[0] * targetResolution[1] * 4).fill(null);
            initializeCropper();
            runStep1();
        }, 50); // TODO: find better way to check that input is finished

        if (!dontLog) {
            const loggingTimestamp = Math.floor((Date.now() - (Date.now() % 8.64e7)) / 1000); 
        }
    };
    reader.readAsDataURL(e.target.files[0]);
}


const imageURLMatch =
    window.location.href.match(
        /image=(https?((:\/\/)|(%3A%2F%2F)))?([-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?)/gi
    ) ?? [];
const imageURL =
    imageURLMatch.length > 0 ? imageURLMatch[0].replace(/image=(https?((:\/\/)|(%3A%2F%2F)))?/gi, "") : null;

if (imageURL != null) {
    setTimeout(() => {
        fetch("https://" + decodeURIComponent(imageURL))
            .then((response) => response.blob())
            .then((colorImage) => {
                try {
                  
                    const colorImageURL = URL.createObjectURL(colorImage);
                    const e = {
                        target: {
                            files: [colorImage],
                        },
                    };
                    handleInputImage(e, true, true);
                } catch (e) {
                    enableInteraction();
                }
            })
            .catch((err) => {
                enableInteraction();
            });
    }, 50); // TODO: find better way to check that input is finished
}

const imageSelectorHidden = document.getElementById("input-image-selector-hidden");
imageSelectorHidden.addEventListener("change", (e) => handleInputImage(e), false);
document.getElementById("input-image-selector").addEventListener("click", () => {
    imageSelectorHidden.click();
});



window.addEventListener("appinstalled", () => {
    perfLoggingDatabase.ref("pwa-install-count/total").transaction(incrementTransaction);
    const loggingTimestamp = Math.floor((Date.now() - (Date.now() % 8.64e7)) / 1000); // 8.64e+7 = ms in day
    perfLoggingDatabase.ref("pwa-install-count/per-day/" + loggingTimestamp).transaction(incrementTransaction);
});

function runStep1() {
    disableInteraction();

    setTimeout(() => {
        runStep2();
    }, 1); // TODO: find better way to check that input is finished
}

const productMap = {
     "2x2": "5ae02c4d-29a1-6364-c27c-16e61682654b",
    "2x3": "3a77b146-17d7-48dc-8282-6cba254375a3",
    "2x4": "1a57b164-02f4-9345-7362-2b06602b3def",
    "2x5": "ddcea709-8755-025c-15cf-e8b82738e64e",
    "2x6": "b0057f9a-6779-431e-af16-29686f402eec",
    "2x7": "7b9cc077-b3a3-c13c-f815-f8f90ca98861",
    "2x8": "edb49639-70a3-46a1-5f2d-1037479f81e7",
    "2x9": "8641e7d2-31a7-738d-0bca-046147cf891f",

    "3x2": "021a12d3-5af8-ca09-050a-bca2cb873f0f",
    "3x3": "125a0de2-ef47-4b9e-e848-bf97853090b2",
    "3x4": "838b7d17-6639-4bcd-77fd-a6cb0b49d025",
    "3x5": "427aaba2-bebe-a2e3-2e52-38e8b403e9dd",
    "3x6": "6b85b6d5-e283-35c3-00ee-4b8f8ac14a37",
    "3x7": "b90431fc-2d99-8461-a0c7-887c31059bf7",
    "3x8": "c44dba6d-f9e8-f8c9-c98c-66eedb0ed8be",
    "3x9": "8801dfd1-848e-d3e9-b2db-eb751e8f61da",

    "4x2": "4ec55190-f2d7-2c9b-4b2f-baaae86ac9b6",
    "4x3": "58cf231a-8de0-3e4f-51d0-0b1cd8352077",
    "4x4": "d1375f05-fbe6-0ce3-2364-c8ccc85d502e",
    "4x5": "5058e04c-d921-4805-cb50-3c23b6d64544",
    "4x6": "8720ead7-3b56-2ced-ecbf-1d67bdf76bf7",
    "4x7": "63c77818-08da-6749-765d-6fc926f3b6bb",
    "4x8": "275abc10-4df2-f619-b5ff-b7da9b324bb3",
    "4x9": "182aa7f4-8250-db79-5c1d-74031604a7df",

    "5x2": "3239a549-70a8-6c5c-fa29-4b13a034ee64",
    "5x3": "6697d3b9-a116-6a0f-9f85-11587fca2a4a",
    "5x4": "0f17ab78-fde2-021c-247a-74594cdae3a7",
    "5x5": "6d9811e4-58d6-c2f0-4670-3bcbef90468b",
    "5x6": "d4be43af-67c2-e880-c366-0d434c2d4c38",
    "5x7": "68c301c2-d4b8-5760-24ee-55f3b2ffb7a9",
    "5x8": "dba72e9b-a7b4-096f-222a-ad209a1ca8d7",
    "5x9": "01180055-37fd-5e75-0dfb-6c111a4cc2ce",

    "6x2": "13cdebe7-fbf7-a0f2-7c3e-c8536904da8a",
    "6x3": "211e651d-8746-71fc-5b54-8ef8297561b0",
    "6x4": "f2b3f7a0-3305-8aad-cde4-d3fffa745a95",
    "6x5": "938c7127-d84d-fbfa-0adb-9154df679c93",
    "6x6": "96860742-20d4-3bc0-b751-128cb25784ea",
    "6x7": "20f58566-1c20-e4a5-fb02-fa9a48ca0f88",
    "6x8": "16515371-79f5-bc90-c990-b658b4001ba1",
    "6x9": "5afac76f-267a-f32e-adbd-38e95a03a1fc",

    "7x2": "4856bc5a-f5d0-8ad2-4042-ade18f4a24a1",
    "7x3": "bdb1e715-da9c-70ad-ef0d-fcb4828c6f7d",
    "7x4": "7ed33721-25df-3f97-f3d6-1f11a6653eea",
    "7x5": "c29aafea-25d4-1cb6-e625-47cfc2619ef2",
    "7x6": "ebb5a979-284a-117f-46bb-e81dbdd8e527",
    "7x7": "eb6f8e8b-9078-d518-6a85-19ca90646886",
    "7x8": "1c86b515-9b6f-47cd-9288-d292a49deea4",
    "7x9": "3896f564-222c-9582-4afe-c0ab45dd5be5",

    "8x2": "cbb02cc2-fdbf-f73a-c274-708ec582b621",
    "8x3": "7b15749f-4d1b-7243-58b6-35c6ab909af8",
    "8x4": "450e5f45-af95-5df6-36e5-e2a3753428e8",
    "8x5": "486a7260-6d18-0768-789d-40ab5d1370eb",
    "8x6": "312fdbf2-4499-e9d6-fd61-c8934af82826",
    "8x7": "317e51da-7ef8-8940-23fc-523bf3a5c8a6",
    "8x8": "dc8cf392-f5bc-75be-a6f3-9f83df5c19fa",
    "8x9": "252267a3-eb66-7fd7-a40d-09beee7d8dc8",

    "9x2": "a98c9845-a9d1-7d33-be34-a6e7474629a2",
    "9x3": "894fd8f0-437b-9b94-d817-270f76927603",
    "9x4": "cc0057da-bff9-6967-2b2e-e59345b389b5",
    "9x5": "765a3be3-8c50-0d0d-ef8d-108c01ccf87c",
    "9x6": "c45fc1d2-e793-55fc-7992-23640c709db2",
    "9x7": "e2abf47f-8168-651e-7680-5a192b4792bb",
    "9x8": "8fff01e0-9dd5-4f57-f569-25ac34c96339",
    "9x9": "bcd3a779-cd54-d435-0df5-7ef8b226251c"
};

document.getElementById("orderButton").addEventListener("click", async () => {
    const width = targetResolution[0] / 16;
    const height = targetResolution[1] / 16;
    const sizeKey = `${width}x${height}`;
    const selectedSize = sizeKey; // np. 2x3, 3x4 itp.
    const canvas = document.getElementById("canvas");
    const imageData = canvas.toDataURL("image/png"); // obraz w base64

    const productId = productMap[selectedSize];

    if (!productId) {
        alert("Error");
        return;
    }

    const response = await fetch("https://spiotrpg.wixsite.com/_functions/dodajDoKoszyka", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, imageData })
    });

    const result = await response.json();

    if (result.success) {
        window.location.href = "https://spiotrpg.wixsite.com/suskabrick/cart-page"; // przekierowanie do koszyka
    } else {
        alert("Error adding to cart!");
        console.error(result.error);
    }
});


enableInteraction(); 
