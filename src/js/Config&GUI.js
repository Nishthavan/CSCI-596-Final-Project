// Function to resize the canvas based on the current client dimensions
function resizeCanvas () {
    console.log("e"); // Log an event to the console (for debugging purposes).

    // Calculate scaled dimensions for the canvas using the device's pixel ratio.
    let scaledWidth = scaleByPixelRatio(canvas.clientWidth);
    let scaledHeight = scaleByPixelRatio(canvas.clientHeight);

    // Check if the current canvas dimensions differ from the scaled dimensions.
    if (canvas.width != scaledWidth || canvas.height != scaledHeight) {
        // Update the canvas width and height if they are different.
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        return true; // Indicate that the canvas was resized.
    }

    return false; // Indicate that no resizing was necessary.
}


// Select the first canvas element on the page.
const canvas = document.getElementsByTagName('canvas')[0];
// Resize the canvas to match its container's dimensions and adjust for pixel ratio.
resizeCanvas();

// Configuration object for simulation settings and parameters.
let config = {
    SIM_RESOLUTION: 128,            // Resolution of the simulation grid.
    DYE_RESOLUTION: 1024,          // Resolution of the dye (color) grid.
    CAPTURE_RESOLUTION: 512,       // Resolution for captured screenshots.
    DENSITY_DISSIPATION: 1,        // Rate at which density dissipates.
    VELOCITY_DISSIPATION: 0.2,     // Rate at which velocity dissipates.
    PRESSURE: 0.8,                 // Pressure parameter for the simulation.
    PRESSURE_ITERATIONS: 20,       // Number of iterations for pressure solving.
    CURL: 30,                      // Amount of curl added to the fluid (turbulence).
    SPLAT_RADIUS: 0.25,            // Radius of splats (fluid disturbances).
    SPLAT_FORCE: 6000,             // Force applied during splats.
    SHADING: true,                 // Whether shading is enabled.
    COLORFUL: true,                // Whether colorful rendering is enabled.
    COLOR_UPDATE_SPEED: 10,        // Speed at which colors update.
    PAUSED: false,                 // Whether the simulation is paused.
    BACK_COLOR: { r: 0, g: 0, b: 0 }, // Background color of the simulation.
    TRANSPARENT: false,            // Whether the canvas is rendered with transparency.
    BLOOM: true,                   // Enable bloom effect.
    BLOOM_ITERATIONS: 8,           // Number of iterations for the bloom effect.
    BLOOM_RESOLUTION: 256,         // Resolution of the bloom effect.
    BLOOM_INTENSITY: 0.8,          // Intensity of the bloom effect.
    BLOOM_THRESHOLD: 0.6,          // Threshold for bloom effect brightness.
    BLOOM_SOFT_KNEE: 0.7,          // Softness of the bloom threshold.
    SUNRAYS: true,                 // Enable sunrays effect.
    SUNRAYS_RESOLUTION: 196,       // Resolution of the sunrays effect.
    SUNRAYS_WEIGHT: 1.0,           // Weight of the sunrays effect.
};


// Constructor for pointerPrototype, which represents user interactions (e.g., mouse or touch input).
function pointerPrototype () {
    this.id = -1;                   // Unique ID for the pointer (e.g., touch ID).
    this.texcoordX = 0;             // Current texture coordinate X.
    this.texcoordY = 0;             // Current texture coordinate Y.
    this.prevTexcoordX = 0;         // Previous texture coordinate X.
    this.prevTexcoordY = 0;         // Previous texture coordinate Y.
    this.deltaX = 0;                // Change in X direction.
    this.deltaY = 0;                // Change in Y direction.
    this.down = false;              // Whether the pointer is currently pressed down.
    this.moved = false;             // Whether the pointer has moved.
    this.color = [30, 0, 300];      // Color of the pointer's splat (fluid interaction).
}


// Array to store active pointers (e.g., mouse or touch interactions).
let pointers = [];
// Stack to manage queued splats (fluid disturbances).
let splatStack = [];
// Add the default pointer to the pointers array.
pointers.push(new pointerPrototype());

// Get WebGL context and extensions for the canvas.
const { gl, ext } = getWebGLContext(canvas);

if (!ext.supportLinearFiltering) {
    config.DYE_RESOLUTION = 512;
    config.SHADING = false;
    config.BLOOM = false;
    config.SUNRAYS = false;
}



function normalizeTexture(textureData, width, height) {
    // Create an array for the normalized result.
    let normalizedData = new Uint8Array(textureData.length);
    let sourceIndex = 0;

    // Iterate over the height and width to normalize pixel values.
    for (let y = height - 1; y >= 0; y--) {
        for (let x = 0; x < width; x++) {
            let destinationIndex = y * width * 4 + x * 4;

            // Clamp and scale pixel values to 0–255 range.
            normalizedData[destinationIndex + 0] = clamp01(textureData[sourceIndex + 0]) * 255;
            normalizedData[destinationIndex + 1] = clamp01(textureData[sourceIndex + 1]) * 255;
            normalizedData[destinationIndex + 2] = clamp01(textureData[sourceIndex + 2]) * 255;
            normalizedData[destinationIndex + 3] = clamp01(textureData[sourceIndex + 3]) * 255;

            sourceIndex += 4;
        }
    }
    return normalizedData;
}

function clamp01(inputValue) {
    // Clamp the input value between 0 and 1.
    return Math.min(Math.max(inputValue, 0), 1);
}


function textureToCanvas(textureData, width, height) {
    // Create a new canvas element.
    let canvasElement = document.createElement('canvas');
    let canvasContext = canvasElement.getContext('2d');

    // Set the canvas dimensions.
    canvasElement.width = width;
    canvasElement.height = height;

    // Create image data and set it with the normalized texture data.
    let imageData = canvasContext.createImageData(width, height);
    imageData.data.set(textureData);

    // Render the image data to the canvas.
    canvasContext.putImageData(imageData, 0, 0);

    return canvasElement;
}


function downloadURI(filename, uri) {
    // Create a temporary link element.
    let downloadLink = document.createElement('a');
    downloadLink.download = filename;
    downloadLink.href = uri;

    // Trigger the download.
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Remove the link element after download.
    document.body.removeChild(downloadLink);
}
