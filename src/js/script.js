'use strict';
// Controls.js
// This file contains JavaScript functions and shaders used for controlling fluid simulation parameters.
// Includes event listeners for UI elements and GLSL shader definitions for rendering fluid dynamics.

// Handles changes to the density dissipation value through the UI.
// Updates the simulation configuration and logs the new value.
function changeDensityControl() { // change Density Dissipation Value
    const densityControl = document.getElementById("densityControl");
    console.log("Density Dissipation value:", densityControl.value);
    config.DENSITY_DISSIPATION = densityControl.value;
}

// Handles changes to the velocity dissipation value through the UI.
// Updates the simulation configuration and logs the new value.
function changeVelocityControl(){ // change Velocity Dissipation Value
    const velocityControl = document.getElementById("velocityControl");
    console.log("Velocity Dissipation value:", velocityControl.value);
    config.VELOCITY_DISSIPATION = velocityControl.value;
}

// Handles changes to the pressure value through the UI.
// Updates the simulation configuration and logs the new value.
function changePressureControl(){ // change Pressure Value
    const pressureControl = document.getElementById("pressureControl");
    console.log("Pressure value:", pressureControl.value);
    config.PRESSURE = pressureControl.value;
}

// Handles changes to the vorticity (CURL) value through the UI.
// Updates the simulation configuration and logs the new value.
function changeVorticityControl(){ // change CURL Value
    const vorticityControl = document.getElementById("vorticityControl");
    console.log("Vorticity value:", vorticityControl.value);
    config.CURL = vorticityControl.value;
}

// Handles changes to the splat radius value through the UI.
// Updates the simulation configuration and logs the new value.
function changeSplatRadiusControl(){
    const splatRadiusControl = document.getElementById("splatRadiusControl");
    console.log("Splat Radius value:", splatRadiusControl.value);
    config.SPLAT_RADIUS = splatRadiusControl.value;
}

// Resets all control values to their default settings.
// Updates the DOM elements and simulation configuration accordingly.
function resetValues(){
    document.getElementById("densityControl").value = 1;
    document.getElementById("velocityControl").value = 0.2;
    document.getElementById("pressureControl").value = 0.8;
    document.getElementById("vorticityControl").value = 30;
    document.getElementById("splatRadiusControl").value = 0.25;
    config.DENSITY_DISSIPATION = 1;
    config.VELOCITY_DISSIPATION = 0.2;
    config.PRESSURE = 0.8;
    config.CURL = 30;
    config.SPLAT_RADIUS = 0.25;
}


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

// startGUI();
function getWebGLContext (canvas) {
    // Parameters for creating the WebGL context.
    const contextParams = { 
        alpha: true,                  // Enable transparency.
        depth: false,                 // Disable depth buffer.
        stencil: false,               // Disable stencil buffer.
        antialias: false,             // Disable anti-aliasing.
        preserveDrawingBuffer: false  // Don't preserve the drawing buffer.
    };

    // Attempt to get a WebGL2 context.
    let glContext = canvas.getContext('webgl2', contextParams);
    const isWebGL2 = !!glContext; // Check if WebGL2 is supported.

    // Fallback to WebGL1 or experimental WebGL if WebGL2 is not available.
    if (!isWebGL2) {
        glContext = canvas.getContext('webgl', contextParams) || canvas.getContext('experimental-webgl', contextParams);
    }

    // Variables to store WebGL extensions and features.
    let halfFloatExtension;
    let supportsLinearFiltering;

    if (isWebGL2) {
        // Enable color buffer float extension for WebGL2.
        glContext.getExtension('EXT_color_buffer_float');
        // Check if linear filtering is supported for floating-point textures.
        supportsLinearFiltering = glContext.getExtension('OES_texture_float_linear');
    } else {
        // For WebGL1, get half-float extension and linear filtering support.
        halfFloatExtension = glContext.getExtension('OES_texture_half_float');
        supportsLinearFiltering = glContext.getExtension('OES_texture_half_float_linear');
    }

    // Set the background clear color to black.
    glContext.clearColor(0.0, 0.0, 0.0, 1.0);

    // Determine the texture type for half-float textures based on the WebGL version.
    const halfFloatTextureType = isWebGL2 ? glContext.HALF_FLOAT : halfFloatExtension.HALF_FLOAT_OES;

    // Variables to store supported texture formats.
    let rgbaFormat, rgFormat, rFormat;

    if (isWebGL2) {
        // WebGL2 texture formats.
        rgbaFormat = getSupportedFormat(glContext, glContext.RGBA16F, glContext.RGBA, halfFloatTextureType);
        rgFormat = getSupportedFormat(glContext, glContext.RG16F, glContext.RG, halfFloatTextureType);
        rFormat = getSupportedFormat(glContext, glContext.R16F, glContext.RED, halfFloatTextureType);
    } else {
        // WebGL1 texture formats (fallback to RGBA if others are not available).
        rgbaFormat = getSupportedFormat(glContext, glContext.RGBA, glContext.RGBA, halfFloatTextureType);
        rgFormat = getSupportedFormat(glContext, glContext.RGBA, glContext.RGBA, halfFloatTextureType);
        rFormat = getSupportedFormat(glContext, glContext.RGBA, glContext.RGBA, halfFloatTextureType);
    }

    // Log an event indicating the WebGL version and support for RGBA format.
    ga('send', 'event', isWebGL2 ? 'webgl2' : 'webgl', rgbaFormat == null ? 'not supported' : 'supported');

    // Return the WebGL context and supported extensions.
    return {
        gl: glContext, // WebGL context.
        ext: {
            formatRGBA: rgbaFormat,           // RGBA texture format.
            formatRG: rgFormat,               // RG texture format.
            formatR: rFormat,                 // R texture format.
            halfFloatTexType: halfFloatTextureType, // Half-float texture type.
            supportLinearFiltering: supportsLinearFiltering // Support for linear filtering.
        }
    };
}

function getSupportedFormat(glContext, internalFormat, format, type) {
    // Check if the specified render texture format is supported.
    if (!supportRenderTextureFormat(glContext, internalFormat, format, type)) {
        // Fallback to other formats if the current format is unsupported.
        switch (internalFormat) {
            case glContext.R16F: // If R16F is unsupported, try RG16F.
                return getSupportedFormat(glContext, glContext.RG16F, glContext.RG, type);
            case glContext.RG16F: // If RG16F is unsupported, try RGBA16F.
                return getSupportedFormat(glContext, glContext.RGBA16F, glContext.RGBA, type);
            default:
                return null; // Return null if no supported format is found.
        }
    }

    // Return the supported format details if successful.
    return {
        internalFormat, // The internal format (e.g., RGBA16F).
        format          // The corresponding external format (e.g., RGBA).
    };
}

function supportRenderTextureFormat(glContext, internalFormat, format, type) {
    // Create and bind a texture to test render compatibility.
    let testTexture = glContext.createTexture();
    glContext.bindTexture(glContext.TEXTURE_2D, testTexture);
    glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MIN_FILTER, glContext.NEAREST);
    glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MAG_FILTER, glContext.NEAREST);
    glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_S, glContext.CLAMP_TO_EDGE);
    glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_T, glContext.CLAMP_TO_EDGE);

    // Define the texture with given format and type.
    glContext.texImage2D(glContext.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

    // Create a framebuffer and attach the texture to it.
    let testFramebuffer = glContext.createFramebuffer();
    glContext.bindFramebuffer(glContext.FRAMEBUFFER, testFramebuffer);
    glContext.framebufferTexture2D(glContext.FRAMEBUFFER, glContext.COLOR_ATTACHMENT0, glContext.TEXTURE_2D, testTexture, 0);

    // Check the framebuffer status to verify if it's complete.
    let framebufferStatus = glContext.checkFramebufferStatus(glContext.FRAMEBUFFER);
    return framebufferStatus == glContext.FRAMEBUFFER_COMPLETE;
}

function startGUI() {
    var gui = new dat.GUI({ width: 300 });

    // Add sliders for simulation parameters.
    gui.add(config, 'DENSITY_DISSIPATION', 0, 4.0).name('density diffusion');
    gui.add(config, 'VELOCITY_DISSIPATION', 0, 4.0).name('velocity diffusion');
    gui.add(config, 'PRESSURE', 0.0, 1.0).name('pressure');

    // Add button for random splats.
    gui.add({ fun: () => {
        splatStack.push(parseInt(Math.random() * 20) + 5);
    } }, 'fun').name('Random splats');

    // Add button to capture a screenshot.
    gui.add({ fun: captureScreenshot }, 'fun').name('Take screenshot');
}

function captureScreenshot() {
    // Determine the resolution for the capture.
    let captureResolution = getResolution(config.CAPTURE_RESOLUTION);

    // Create a framebuffer object for the screenshot.
    let captureTarget = createFBO(captureResolution.width, captureResolution.height, ext.formatRGBA.internalFormat, ext.formatRGBA.format, ext.halfFloatTexType, gl.NEAREST);

    // Render the current simulation state into the framebuffer.
    render(captureTarget);

    // Convert the framebuffer to a texture.
    let rawTexture = framebufferToTexture(captureTarget);

    // Normalize the texture data.
    let normalizedTexture = normalizeTexture(rawTexture, captureTarget.width, captureTarget.height);

    // Convert the texture into a canvas element.
    let screenshotCanvas = textureToCanvas(normalizedTexture, captureTarget.width, captureTarget.height);

    // Create a data URI from the canvas.
    let dataUri = screenshotCanvas.toDataURL();

    // Download the screenshot as a file.
    downloadURI('fluid.png', dataUri);

    // Clean up the URI.
    URL.revokeObjectURL(dataUri);
}

function framebufferToTexture(targetFramebuffer) {
    // Bind the framebuffer.
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer.fbo);

    // Calculate the length of the texture data array.
    let textureDataLength = targetFramebuffer.width * targetFramebuffer.height * 4;

    // Read the pixels from the framebuffer into a Float32Array.
    let pixelData = new Float32Array(textureDataLength);
    gl.readPixels(0, 0, targetFramebuffer.width, targetFramebuffer.height, gl.RGBA, gl.FLOAT, pixelData);
    return pixelData;
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

// Material Class for Shaders...
class ShaderMaterial {
    constructor (vertexShader, fragmentShaderSource) {
        this.vertexShader = vertexShader;
        this.fragmentShaderSource = fragmentShaderSource;
        this.programs = [];
        this.activeProgram = null;
        this.uniforms = [];
    }
    setKeywords (keywords) {
        let hash = keywords.reduce((accum, keyword) => accum + hashCode(keyword), 0);
        let program = this.programs[hash];
        if (program == null)
        {
            let fragmentShader = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
            program = generateProgram(this.vertexShader, fragmentShader);
            this.programs[hash] = program;
        }
        if (program == this.activeProgram) return;
        this.uniforms = extractUniforms(program);
        this.activeProgram = program;
    }
    bind () {
        gl.useProgram(this.activeProgram);
    }
}

// Shader Program Class
class ShaderProgram {
    constructor (vertexShader, fragmentShader) {
        this.uniforms = {};
        this.program = generateProgram(vertexShader, fragmentShader);
        this.uniforms = extractUniforms(this.program);
    }
    bind () {
        gl.useProgram(this.program);
    }
}

// Function to Create Shaders
function compileShader (type, source, keywords) {
    source = appendKeywords(source, keywords);
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        console.trace(gl.getShaderInfoLog(shader));
    return shader;
};


// Util Functions
function generateProgram(vertexSrc, fragSrc) {
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexSrc);
    gl.attachShader(shaderProgram, fragSrc);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.trace(gl.getProgramInfoLog(shaderProgram));
    }
    return shaderProgram;
}

function extractUniforms(programID) {
    const uniformDetails = [];
    const activeUniformCount = gl.getProgramParameter(programID, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < activeUniformCount; i++) {
        const uniformInfo = gl.getActiveUniform(programID, i).name;
        uniformDetails[uniformInfo] = gl.getUniformLocation(programID, uniformInfo);
    }
    return uniformDetails;
}

function appendKeywords(sourceText, keywordArray) {
    if (!keywordArray) return sourceText;
    const keywordDefs = keywordArray.map(keyword => `#define ${keyword}\n`).join('');
    return keywordDefs + sourceText;
}


// Creating Shaders....
const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
    precision highp float;

    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;

    void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`);

const blurVertexShader = compileShader(gl.VERTEX_SHADER, `
    precision highp float;

    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    uniform vec2 texelSize;

    void main () {
        vUv = aPosition * 0.5 + 0.5;
        float offset = 1.33333333;
        vL = vUv - texelSize * offset;
        vR = vUv + texelSize * offset;
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`);

const blurShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    uniform sampler2D uTexture;

    void main () {
        vec4 sum = texture2D(uTexture, vUv) * 0.29411764;
        sum += texture2D(uTexture, vL) * 0.35294117;
        sum += texture2D(uTexture, vR) * 0.35294117;
        gl_FragColor = sum;
    }
`);

const copyShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
        gl_FragColor = texture2D(uTexture, vUv);
    }
`);

const clearShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;

    void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
    }
`);

const colorShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;

    uniform vec4 color;

    void main () {
        gl_FragColor = color;
    }
`);

const checkerboardShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float aspectRatio;

    #define SCALE 25.0

    void main () {
        vec2 uv = floor(vUv * SCALE * vec2(aspectRatio, 1.0));
        float v = mod(uv.x + uv.y, 2.0);
        v = v * 0.1 + 0.8;
        gl_FragColor = vec4(vec3(v), 1.0);
    }
`);

const displayShaderSource = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform sampler2D uBloom;
    uniform sampler2D uSunrays;
    uniform sampler2D uDithering;
    uniform vec2 ditherScale;
    uniform vec2 texelSize;

    vec3 linearToGamma (vec3 color) {
        color = max(color, vec3(0));
        return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
    }

    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;

    #ifdef SHADING
        vec3 lc = texture2D(uTexture, vL).rgb;
        vec3 rc = texture2D(uTexture, vR).rgb;
        vec3 tc = texture2D(uTexture, vT).rgb;
        vec3 bc = texture2D(uTexture, vB).rgb;

        float dx = length(rc) - length(lc);
        float dy = length(tc) - length(bc);

        vec3 n = normalize(vec3(dx, dy, length(texelSize)));
        vec3 l = vec3(0.0, 0.0, 1.0);

        float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
        c *= diffuse;
    #endif

    #ifdef BLOOM
        vec3 bloom = texture2D(uBloom, vUv).rgb;
    #endif

    #ifdef SUNRAYS
        float sunrays = texture2D(uSunrays, vUv).r;
        c *= sunrays;
    #ifdef BLOOM
        bloom *= sunrays;
    #endif
    #endif

    #ifdef BLOOM
        float noise = texture2D(uDithering, vUv * ditherScale).r;
        noise = noise * 2.0 - 1.0;
        bloom += noise / 255.0;
        bloom = linearToGamma(bloom);
        c += bloom;
    #endif

        float a = max(c.r, max(c.g, c.b));
        gl_FragColor = vec4(c, a);
    }
`;

const bloomPrefilterShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform vec3 curve;
    uniform float threshold;

    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        float br = max(c.r, max(c.g, c.b));
        float rq = clamp(br - curve.x, 0.0, curve.y);
        rq = curve.z * rq * rq;
        c *= max(rq, br - threshold) / max(br, 0.0001);
        gl_FragColor = vec4(c, 0.0);
    }
`);

const bloomBlurShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;

    void main () {
        vec4 sum = vec4(0.0);
        sum += texture2D(uTexture, vL);
        sum += texture2D(uTexture, vR);
        sum += texture2D(uTexture, vT);
        sum += texture2D(uTexture, vB);
        sum *= 0.25;
        gl_FragColor = sum;
    }
`);

const bloomFinalShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform float intensity;

    void main () {
        vec4 sum = vec4(0.0);
        sum += texture2D(uTexture, vL);
        sum += texture2D(uTexture, vR);
        sum += texture2D(uTexture, vT);
        sum += texture2D(uTexture, vB);
        sum *= 0.25;
        gl_FragColor = sum * intensity;
    }
`);

const sunraysMaskShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
        vec4 c = texture2D(uTexture, vUv);
        float br = max(c.r, max(c.g, c.b));
        c.a = 1.0 - min(max(br * 20.0, 0.0), 0.8);
        gl_FragColor = c;
    }
`);

const sunraysShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float weight;

    #define ITERATIONS 16

    void main () {
        float Density = 0.3;
        float Decay = 0.95;
        float Exposure = 0.7;

        vec2 coord = vUv;
        vec2 dir = vUv - 0.5;

        dir *= 1.0 / float(ITERATIONS) * Density;
        float illuminationDecay = 1.0;

        float color = texture2D(uTexture, vUv).a;

        for (int i = 0; i < ITERATIONS; i++)
        {
            coord -= dir;
            float col = texture2D(uTexture, coord).a;
            color += col * illuminationDecay * weight;
            illuminationDecay *= Decay;
        }

        gl_FragColor = vec4(color * Exposure, 0.0, 0.0, 1.0);
    }
`);

const splatShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;

    void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
    }
`);

const advectionShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;

    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
        vec2 st = uv / tsize - 0.5;

        vec2 iuv = floor(st);
        vec2 fuv = fract(st);

        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
        vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
        vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }

    void main () {
    #ifdef MANUAL_FILTERING
        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
        vec4 result = bilerp(uSource, coord, dyeTexelSize);
    #else
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
    #endif
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
    }`,
    ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']
);

const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;

        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }

        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
`);

const curlShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
    }
`);

const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;

    void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;

        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;

        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity += force * dt;
        velocity = min(max(velocity, -1000.0), 1000.0);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`);

const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
`);

const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`);

// Simulation Functionality Impl
const blit = (() => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    return (target, clear = false) => {
        if (target == null)
        {
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        else
        {
            gl.viewport(0, 0, target.width, target.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        }
        if (clear)
        {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }
})();

function CHECK_FRAMEBUFFER_STATUS () {
    let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status != gl.FRAMEBUFFER_COMPLETE)
        console.trace("Framebuffer error: " + status);
}

let bloom;
let dye;
let velocity;
let divergence;
let curl;
let pressure;
let bloomFramebuffers = [];
let sunrays;
let sunraysTemp;
let ditheringTexture = createTextureAsync('LDR_LLL1_0.png');
const blurProgram            = new ShaderProgram(blurVertexShader, blurShader);
const copyProgram            = new ShaderProgram(baseVertexShader, copyShader);
const clearProgram           = new ShaderProgram(baseVertexShader, clearShader);
const colorProgram           = new ShaderProgram(baseVertexShader, colorShader);
const checkerboardProgram    = new ShaderProgram(baseVertexShader, checkerboardShader);
const bloomPrefilterProgram  = new ShaderProgram(baseVertexShader, bloomPrefilterShader);
const bloomBlurProgram       = new ShaderProgram(baseVertexShader, bloomBlurShader);
const bloomFinalProgram      = new ShaderProgram(baseVertexShader, bloomFinalShader);
const sunraysMaskProgram     = new ShaderProgram(baseVertexShader, sunraysMaskShader);
const sunraysProgram         = new ShaderProgram(baseVertexShader, sunraysShader);
const splatProgram           = new ShaderProgram(baseVertexShader, splatShader);
const advectionProgram       = new ShaderProgram(baseVertexShader, advectionShader);
const divergenceProgram      = new ShaderProgram(baseVertexShader, divergenceShader);
const curlProgram            = new ShaderProgram(baseVertexShader, curlShader);
const vorticityProgram       = new ShaderProgram(baseVertexShader, vorticityShader);
const pressureProgram        = new ShaderProgram(baseVertexShader, pressureShader);
const gradienSubtractProgram = new ShaderProgram(baseVertexShader, gradientSubtractShader);
const displayMaterial = new ShaderMaterial(baseVertexShader, displayShaderSource);

function initFramebuffers () {
    let simRes = getResolution(config.SIM_RESOLUTION);
    let dyeRes = getResolution(config.DYE_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const rgba    = ext.formatRGBA;
    const rg      = ext.formatRG;
    const r       = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    gl.disable(gl.BLEND);

    if (dye == null)
        dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    else
        dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);

    if (velocity == null)
        velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    else
        velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);

    divergence = createFBO      (simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    curl       = createFBO      (simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    pressure   = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);

    console.log("initFramebuffers triggers");
    initBloomFramebuffers();
    initSunraysFramebuffers();
}

function initBloomFramebuffers () {
    let res = getResolution(config.BLOOM_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    bloom = createFBO(res.width, res.height, rgba.internalFormat, rgba.format, texType, filtering);

    bloomFramebuffers.length = 0;
    for (let i = 0; i < config.BLOOM_ITERATIONS; i++)
    {
        let width = res.width >> (i + 1);
        let height = res.height >> (i + 1);

        if (width < 2 || height < 2) break;

        let fbo = createFBO(width, height, rgba.internalFormat, rgba.format, texType, filtering);
        bloomFramebuffers.push(fbo);
    }
}


function initSunraysFramebuffers () {
    let res = getResolution(config.SUNRAYS_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    sunrays     = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
    sunraysTemp = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
}


function createFBO (w, h, internalFormat, format, type, param) {
    gl.activeTexture(gl.TEXTURE0);
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let texelSizeX = 1.0 / w;
    let texelSizeY = 1.0 / h;
    // console.log("Create FBO");
    return {
        texture,
        fbo,
        width: w,
        height: h,
        texelSizeX,
        texelSizeY,
        attach (id) {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
        }
    };
}

function createDoubleFBO (w, h, internalFormat, format, type, param) {
    let fbo1 = createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(w, h, internalFormat, format, type, param);

    return {
        width: w,
        height: h,
        texelSizeX: fbo1.texelSizeX,
        texelSizeY: fbo1.texelSizeY,
        get read () {
            return fbo1;
        },
        set read (value) {
            fbo1 = value;
        },
        get write () {
            return fbo2;
        },
        set write (value) {
            fbo2 = value;
        },
        swap () {
            let temp = fbo1;
            fbo1 = fbo2;
            fbo2 = temp;
        }
    }
}

function resizeFBO (target, w, h, internalFormat, format, type, param) {
    let newFBO = createFBO(w, h, internalFormat, format, type, param);
    copyProgram.bind();
    gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
    blit(newFBO);
    return newFBO;
}


function resizeDoubleFBO (target, w, h, internalFormat, format, type, param) {
    if (target.width == w && target.height == h)
        return target;
    target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
    target.write = createFBO(w, h, internalFormat, format, type, param);
    target.width = w;
    target.height = h;
    target.texelSizeX = 1.0 / w;
    target.texelSizeY = 1.0 / h;
    return target;
}

function createTextureAsync (url) {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255]));

    let obj = {
        texture,
        width: 1,
        height: 1,
        attach (id) {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
        }
    };

    let image = new Image();
    image.onload = () => {
        obj.width = image.width;
        obj.height = image.height;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    };
    image.src = url;

    return obj;
}


function updateKeywords () {
    let displayKeywords = [];
    if (config.SHADING) displayKeywords.push("SHADING");
    if (config.BLOOM) displayKeywords.push("BLOOM");
    if (config.SUNRAYS) displayKeywords.push("SUNRAYS");
    displayMaterial.setKeywords(displayKeywords);
}

updateKeywords();
initFramebuffers();
multipleSplats(parseInt(Math.random() * 20) + 5);

let lastUpdateTime = Date.now();
let colorUpdateTimer = 0.0;
update();

function update () {
    const dt = calcDeltaTime();
    if (resizeCanvas())
        initFramebuffers();
    updateColors(dt);
    applyInputs();
    if (!config.PAUSED)
        step(dt);
    render(null);
    requestAnimationFrame(update);
}


function calcDeltaTime () {
    let now = Date.now();
    let dt = (now - lastUpdateTime) / 1000;
    dt = Math.min(dt, 0.016666);
    lastUpdateTime = now;
    return dt;
}

function updateColors (dt) {
    if (!config.COLORFUL) return;

    colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
    if (colorUpdateTimer >= 1) {
        colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
        pointers.forEach(p => {
            p.color = generateColor();
        });
    }
}

function applyInputs () {
    if (splatStack.length > 0)
        multipleSplats(splatStack.pop());
    // console.log("applying ...");
    pointers.forEach(p => {
        if (p.moved) {
            p.moved = false;
            splatPointer(p);
        }
    });
}

/**
 * The `step` function performs a single simulation step for the fluid dynamics.
 * It updates the velocity and density fields using a series of operations,
 * including vorticity calculation, divergence computation, pressure solving,
 * gradient subtraction, and advection. Each step ensures that the fluid simulation
 * maintains realistic behavior, such as incompressibility and natural-looking motion.
 * The function also handles dissipation to simulate energy loss over time.
 *
 * @param {number} dt - The time step for the simulation, determining the rate of updates.
 */
function step(dt) {
    // Disabling blending mode to ensure proper rendering
    gl.disable(gl.BLEND);

    // Calculating the curl of the velocity field for vorticity computation
    curlProgram.bind();
    gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY); // Setting texture size
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0)); // Attaching velocity texture
    blit(curl); // Rendering the result into the curl texture

    // Applying vorticity confinement to enhance small vortices in the simulation
    vorticityProgram.bind();
    gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY); // Setting texture size
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0)); // Attaching velocity texture
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1)); // Attaching curl texture
    gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL); // Setting vorticity strength
    gl.uniform1f(vorticityProgram.uniforms.dt, dt); // Passing time step
    blit(velocity.write); // Applying the vorticity force to velocity
    velocity.swap(); // Swapping velocity textures

    // Calculating the divergence of the velocity field
    divergenceProgram.bind();
    gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY); // Setting texture size
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0)); // Attaching velocity texture
    blit(divergence); // Rendering the result into the divergence texture

    // Resetting the pressure texture
    clearProgram.bind();
    gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0)); // Attaching pressure texture
    gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE); // Setting the default pressure value
    blit(pressure.write); // Clearing the pressure texture
    pressure.swap(); // Swapping pressure textures

    // Iteratively solving the pressure Poisson equation
    pressureProgram.bind();
    gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY); // Setting texture size
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0)); // Attaching divergence texture
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1)); // Attaching current pressure texture
        blit(pressure.write); // Rendering the updated pressure texture
        pressure.swap(); // Swapping pressure textures
    }

    // Subtracting the pressure gradient from the velocity field to maintain incompressibility
    gradienSubtractProgram.bind();
    gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY); // Setting texture size
    gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read.attach(0)); // Attaching pressure texture
    gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1)); // Attaching velocity texture
    blit(velocity.write); // Applying the gradient subtraction to velocity
    velocity.swap(); // Swapping velocity textures

    // Advecting (transporting) the velocity field using itself
    advectionProgram.bind();
    gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY); // Setting texture size
    if (!ext.supportLinearFiltering) {
        gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY); // Setting fallback texel size for non-linear filtering
    }
    let velocityId = velocity.read.attach(0);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId); // Attaching velocity texture
    gl.uniform1i(advectionProgram.uniforms.uSource, velocityId); // Using velocity texture as source
    gl.uniform1f(advectionProgram.uniforms.dt, dt); // Passing time step
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION); // Setting velocity dissipation
    blit(velocity.write); // Rendering the updated velocity texture
    velocity.swap(); // Swapping velocity textures

    // Advecting (transporting) the dye field using the velocity field
    if (!ext.supportLinearFiltering) {
        gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY); // Setting fallback texel size for non-linear filtering
    }
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0)); // Attaching velocity texture
    gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1)); // Attaching dye texture as source
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION); // Setting dye dissipation
    blit(dye.write); // Rendering the updated dye texture
    dye.swap(); // Swapping dye textures
}

/**
 * The `render` function is responsible for rendering the fluid simulation onto the canvas or a specified target.
 * It applies visual effects like bloom and sunrays if they are enabled, handles blending for transparent or opaque outputs,
 * and draws the final simulation display along with optional background patterns.
 *
 * @param {WebGLFramebuffer|null} target - The render target, or null to render directly to the canvas.
 */
function render(target) {
    // Checking if bloom effect is enabled and applying it
    if (config.BLOOM)
        applyBloom(dye.read, bloom);

    // Checking if sunrays effect is enabled and applying it
    if (config.SUNRAYS) {
        applySunrays(dye.read, dye.write, sunrays); // Adding sunray effect
        blur(sunrays, sunraysTemp, 1); // Blurring the sunrays for smoothness
    }

    // Configuring blending mode based on transparency setting
    if (target == null || !config.TRANSPARENT) {
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // Setting blend function for opaque rendering
        gl.enable(gl.BLEND); // Enabling blending
    } else {
        gl.disable(gl.BLEND); // Disabling blending for transparent rendering
    }

    // Drawing background color or checkerboard pattern based on transparency setting
    if (!config.TRANSPARENT)
        drawColor(target, normalizeColor(config.BACK_COLOR)); // Drawing solid background color
    if (target == null && config.TRANSPARENT)
        drawCheckerboard(target); // Drawing checkerboard pattern for transparency effect

    // Rendering the display content
    drawDisplay(target);
}

/**
 * The `drawColor` function is handling the rendering of a solid background color onto a given target.
 * It uses a color shader program and renders the specified RGBA color.
 *
 * @param {WebGLFramebuffer|null} target - The render target, or null to render directly to the canvas.
 * @param {Object} color - The color to draw, containing `r`, `g`, `b` components (0-1 range).
 */
function drawColor(target, color) {
    // Binding the color program and setting the background color
    colorProgram.bind();
    gl.uniform4f(colorProgram.uniforms.color, color.r, color.g, color.b, 1); // Setting RGBA color
    blit(target); // Rendering the color to the target
}

/**
 * The `drawCheckerboard` function is drawing a checkerboard pattern as the background onto a given target.
 * This is typically used when the output is set to be transparent.
 *
 * @param {WebGLFramebuffer|null} target - The render target, or null to render directly to the canvas.
 */
function drawCheckerboard(target) {
    // Binding the checkerboard program and setting the aspect ratio
    checkerboardProgram.bind();
    gl.uniform1f(checkerboardProgram.uniforms.aspectRatio, canvas.width / canvas.height); // Setting the aspect ratio
    blit(target); // Rendering the checkerboard pattern to the target
}

/**
 * The `drawDisplay` function is rendering the main simulation content onto a specified target.
 * It handles optional effects like bloom, sunrays, and dithering, and applies shading if configured.
 * The function dynamically adjusts parameters based on the target's dimensions.
 *
 * @param {WebGLFramebuffer|null} target - The render target, or null to render directly to the canvas.
 */
function drawDisplay(target) {
    // Calculating the width and height of the target or drawing buffer
    let width = target == null ? gl.drawingBufferWidth : target.width;
    let height = target == null ? gl.drawingBufferHeight : target.height;

    // Binding the display material and setting shading-related uniforms
    displayMaterial.bind();
    if (config.SHADING)
        gl.uniform2f(displayMaterial.uniforms.texelSize, 1.0 / width, 1.0 / height); // Setting texel size for shading
    gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0)); // Attaching dye texture

    // Adding bloom effect if enabled
    if (config.BLOOM) {
        gl.uniform1i(displayMaterial.uniforms.uBloom, bloom.attach(1)); // Attaching bloom texture
        gl.uniform1i(displayMaterial.uniforms.uDithering, ditheringTexture.attach(2)); // Attaching dithering texture
        let scale = getTextureScale(ditheringTexture, width, height); // Calculating dithering scale
        gl.uniform2f(displayMaterial.uniforms.ditherScale, scale.x, scale.y); // Setting dithering scale
    }

    // Adding sunrays effect if enabled
    if (config.SUNRAYS)
        gl.uniform1i(displayMaterial.uniforms.uSunrays, sunrays.attach(3)); // Attaching sunrays texture

    // Rendering the display to the target
    blit(target);
}

// Function `applyBloom` is applying a bloom effect to the source texture and rendering the result to the destination texture.
// Bloom is a post-processing effect used to simulate light scattering, making bright areas appear to glow.
function applyBloom(source, destination) {
    // Checking if there are enough bloom framebuffers for the operation
    if (bloomFramebuffers.length < 2)
        return;

    let last = destination;

    // Disabling blending mode for the initial bloom prefilter pass
    gl.disable(gl.BLEND);

    // Binding the bloom prefilter program for thresholding and knee calculation
    bloomPrefilterProgram.bind();
    // Calculating knee parameters for smooth bloom thresholding
    let knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
    let curve0 = config.BLOOM_THRESHOLD - knee;
    let curve1 = knee * 2;
    let curve2 = 0.25 / knee;
    // Passing curve parameters and threshold value to the shader
    gl.uniform3f(bloomPrefilterProgram.uniforms.curve, curve0, curve1, curve2);
    gl.uniform1f(bloomPrefilterProgram.uniforms.threshold, config.BLOOM_THRESHOLD);
    // Attaching the source texture and setting it for processing
    gl.uniform1i(bloomPrefilterProgram.uniforms.uTexture, source.attach(0));
    // Performing a prefilter blit operation on the destination framebuffer
    blit(last);

    // Binding the bloom blur program for downsampling and blurring
    bloomBlurProgram.bind();
    // Iterating over each bloom framebuffer to progressively blur the texture
    for (let i = 0; i < bloomFramebuffers.length; i++) {
        let dest = bloomFramebuffers[i];
        // Setting the texel size for accurate sampling in the blur shader
        gl.uniform2f(bloomBlurProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
        // Attaching the previous texture as input to the current blur pass
        gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
        // Performing a blit operation to render the blurred texture into the current framebuffer
        blit(dest);
        // Updating `last` to point to the current framebuffer for the next pass
        last = dest;
    }

    // Enabling additive blending to combine blurred layers
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);

    // Iterating over the framebuffers in reverse order to upsample and merge them
    for (let i = bloomFramebuffers.length - 2; i >= 0; i--) {
        let baseTex = bloomFramebuffers[i];
        // Setting the texel size for accurate sampling during upsampling
        gl.uniform2f(bloomBlurProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
        // Attaching the current blurred texture as input for blending
        gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
        // Adjusting viewport to the size of the base texture
        gl.viewport(0, 0, baseTex.width, baseTex.height);
        // Performing a blit operation to merge the textures
        blit(baseTex);
        // Updating `last` to point to the base texture
        last = baseTex;
    }

    // Disabling blending mode before the final bloom pass
    gl.disable(gl.BLEND);

    // Binding the bloom final program for the final compositing step
    bloomFinalProgram.bind();
    // Setting the texel size for the final shader pass
    gl.uniform2f(bloomFinalProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
    // Attaching the last processed texture as input for the final pass
    gl.uniform1i(bloomFinalProgram.uniforms.uTexture, last.attach(0));
    // Setting the bloom intensity for the final compositing
    gl.uniform1f(bloomFinalProgram.uniforms.intensity, config.BLOOM_INTENSITY);
    // Performing a blit operation to render the final bloom effect onto the destination framebuffer
    blit(destination);
}

/**
 * The `applySunrays` function is applying the sunray effect to the source texture.
 * It creates a mask and uses it to render the final sunray effect onto the destination texture.
 * 
 * @param {WebGLTexture} source - The source texture for generating sunrays.
 * @param {WebGLFramebuffer} mask - The intermediate mask texture.
 * @param {WebGLFramebuffer} destination - The destination texture where sunrays are rendered.
 */
function applySunrays(source, mask, destination) {
    // Disabling blending to render sunrays
    gl.disable(gl.BLEND);

    // Binding the sunrays mask program and attaching the source texture
    sunraysMaskProgram.bind();
    gl.uniform1i(sunraysMaskProgram.uniforms.uTexture, source.attach(0)); // Setting the source texture
    blit(mask); // Rendering the mask

    // Binding the sunrays program and attaching the mask
    sunraysProgram.bind();
    gl.uniform1f(sunraysProgram.uniforms.weight, config.SUNRAYS_WEIGHT); // Setting the sunray weight
    gl.uniform1i(sunraysProgram.uniforms.uTexture, mask.attach(0)); // Attaching the mask texture
    blit(destination); // Rendering the sunrays effect to the destination
}

/**
 * The `blur` function is applying a blur effect to a target texture over a specified number of iterations.
 * It alternates between horizontal and vertical passes for each iteration.
 * 
 * @param {WebGLFramebuffer} target - The texture to apply the blur effect on.
 * @param {WebGLFramebuffer} temp - The temporary texture used during the blur passes.
 * @param {number} iterations - The number of blur iterations to perform.
 */
function blur(target, temp, iterations) {
    // Binding the blur program
    blurProgram.bind();

    // Iterating to apply horizontal and vertical blur passes
    for (let i = 0; i < iterations; i++) {
        // Setting horizontal blur pass
        gl.uniform2f(blurProgram.uniforms.texelSize, target.texelSizeX, 0.0);
        gl.uniform1i(blurProgram.uniforms.uTexture, target.attach(0)); // Attaching the target texture
        blit(temp); // Rendering to the temporary texture

        // Setting vertical blur pass
        gl.uniform2f(blurProgram.uniforms.texelSize, 0.0, target.texelSizeY);
        gl.uniform1i(blurProgram.uniforms.uTexture, temp.attach(0)); // Attaching the temporary texture
        blit(target); // Rendering back to the target texture
    }
}

/**
 * The `splatPointer` function is creating a splat effect at the pointer's location.
 * It calculates the force based on the pointer's movement and applies the splat effect with the given color.
 * 
 * @param {Object} pointer - The pointer object containing position, movement, and color data.
 */
function splatPointer(pointer) {
    // Calculating the force based on pointer movement and configuration
    let dx = pointer.deltaX * config.SPLAT_FORCE;
    let dy = pointer.deltaY * config.SPLAT_FORCE;

    // Calling the splat function to create the splat effect
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
}

/**
 * The `multipleSplats` function is generating multiple random splats across the canvas.
 * It creates random positions, directions, and colors for the splats.
 * 
 * @param {number} amount - The number of splats to create.
 */
function multipleSplats(amount) {
    // Iterating to create the specified number of splats
    for (let i = 0; i < amount; i++) {
        const color = generateColor(); // Generating a random color
        color.r *= 10.0; // Increasing red intensity
        color.g *= 10.0; // Increasing green intensity
        color.b *= 10.0; // Increasing blue intensity

        const x = Math.random(); // Generating random x position
        const y = Math.random(); // Generating random y position
        const dx = 1000 * (Math.random() - 0.5); // Generating random x force
        const dy = 1000 * (Math.random() - 0.5); // Generating random y force

        splat(x, y, dx, dy, color); // Creating the splat
    }
}

/**
 * The `splat` function is creating a single splat effect at the specified position.
 * It applies the splat to both velocity and dye textures with the provided direction and color.
 * 
 * @param {number} x - The x-coordinate of the splat.
 * @param {number} y - The y-coordinate of the splat.
 * @param {number} dx - The x-direction force of the splat.
 * @param {number} dy - The y-direction force of the splat.
 * @param {Object} color - The color of the splat, with `r`, `g`, `b` components.
 */
function splat(x, y, dx, dy, color) {
    // Applying the splat to the velocity texture
    splatProgram.bind();
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0)); // Attaching the velocity texture
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height); // Setting aspect ratio
    gl.uniform2f(splatProgram.uniforms.point, x, y); // Setting the splat position
    gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0); // Setting the force vector
    gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100.0)); // Calculating and setting radius
    blit(velocity.write); // Rendering to the velocity texture
    velocity.swap();

    // Applying the splat to the dye texture
    gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0)); // Attaching the dye texture
    gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b); // Setting the color
    blit(dye.write); // Rendering to the dye texture
    dye.swap();
}

/**
 * The `correctRadius` function is adjusting the radius of a splat effect based on the canvas aspect ratio.
 * It ensures that the radius remains visually proportional on non-square canvases.
 * 
 * @param {number} radius - The initial radius of the splat.
 * @returns {number} - The adjusted radius.
 */
function correctRadius(radius) {
    // Calculating the aspect ratio of the canvas
    let aspectRatio = canvas.width / canvas.height;

    // Adjusting the radius for wide or tall canvases
    if (aspectRatio > 1)
        radius *= aspectRatio;

    return radius; // Returning the corrected radius
}

/**
 * The `mousedown` event listener is tracking mouse down events on the canvas.
 * It is updating the pointer state for interaction initialization.
 */
canvas.addEventListener('mousedown', e => {
    // Calculating the scaled position of the mouse click
    let posX = scaleByPixelRatio(e.offsetX);
    let posY = scaleByPixelRatio(e.offsetY);

    // Finding the primary pointer or creating a new one
    let pointer = pointers.find(p => p.id == -1);
    if (pointer == null)
        pointer = new pointerPrototype();

    // Updating pointer data to reflect the mouse down event
    updatePointerDownData(pointer, -1, posX, posY);
});

/**
 * The `mousemove` event listener is tracking mouse movement while the pointer is down.
 * It is updating the pointer's movement data in real time.
 */
canvas.addEventListener('mousemove', e => {
    // Retrieving the primary pointer
    let pointer = pointers[0];
    if (!pointer.down) return; // Skipping if the pointer is not down

    // Calculating the scaled position of the mouse movement
    let posX = scaleByPixelRatio(e.offsetX);
    let posY = scaleByPixelRatio(e.offsetY);

    // Updating the pointer's movement data
    updatePointerMoveData(pointer, posX, posY);
});

/**
 * The `mouseup` event listener is resetting the pointer state when the mouse button is released.
 */
window.addEventListener('mouseup', () => {
    // Updating the pointer data to reflect the mouse up event
    updatePointerUpData(pointers[0]);
});

/**
 * The `touchstart` event listener is handling touch start interactions on the canvas.
 * It is updating pointers for each active touch.
 */
canvas.addEventListener('touchstart', e => {
    e.preventDefault(); // Preventing default touch behavior
    console.log('touchstart');

    // Retrieving all active touches
    const touches = e.targetTouches;

    // Creating new pointers if needed to match the number of touches
    while (touches.length >= pointers.length)
        pointers.push(new pointerPrototype());

    // Updating each pointer to reflect the touch start event
    for (let i = 0; i < touches.length; i++) {
        let posX = scaleByPixelRatio(touches[i].pageX);
        let posY = scaleByPixelRatio(touches[i].pageY);
        updatePointerDownData(pointers[i + 1], touches[i].identifier, posX, posY);
    }
});

/**
 * The `touchmove` event listener is tracking touch movement on the canvas.
 * It is updating pointer movement data for all active touches.
 */
canvas.addEventListener('touchmove', e => {
    e.preventDefault(); // Preventing default touch behavior
    console.log('touchmove');

    // Retrieving all active touches
    const touches = e.targetTouches;

    // Updating movement data for each active touch
    for (let i = 0; i < touches.length; i++) {
        let pointer = pointers[i + 1];
        if (!pointer.down) continue; // Skipping if the pointer is not down

        let posX = scaleByPixelRatio(touches[i].pageX);
        let posY = scaleByPixelRatio(touches[i].pageY);
        updatePointerMoveData(pointer, posX, posY);
    }
}, false);

/**
 * The `touchend` event listener is handling the end of touch interactions.
 * It is updating pointer states for all ended touches.
 */
window.addEventListener('touchend', e => {
    const touches = e.changedTouches;
    console.log('touchend');

    // Updating each pointer to reflect the touch end event
    for (let i = 0; i < touches.length; i++) {
        let pointer = pointers.find(p => p.id == touches[i].identifier);
        if (pointer == null) continue; // Skipping if the pointer is not found
        updatePointerUpData(pointer);
    }
});

/**
 * The `keydown` event listener is monitoring keypresses.
 * It is toggling the pause state or triggering random splats based on key input.
 */
window.addEventListener('keydown', e => {
    if (e.code === 'KeyP')
        config.PAUSED = !config.PAUSED; // Toggling the pause state
    if (e.key === ' ')
        splatStack.push(parseInt(Math.random() * 20) + 5); // Adding random splats
});

/**
 * The `updatePointerDownData` function is initializing pointer data when a pointer goes down.
 * It is setting the position, color, and movement state.
 */
function updatePointerDownData(pointer, id, posX, posY) {
    // Setting pointer ID and status
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;

    // Calculating and setting texture coordinates
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;

    // Storing previous coordinates
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;

    // Initializing movement deltas and assigning a random color
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = generateColor();
}

/**
 * The `updatePointerMoveData` function is updating pointer data during movement.
 * It is calculating deltas and marking the pointer as moved.
 */
function updatePointerMoveData(pointer, posX, posY) {
    // Storing previous texture coordinates
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;

    // Calculating new texture coordinates
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;

    // Calculating deltas for movement
    pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);

    // Marking the pointer as moved if deltas are significant
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
}

/**
 * The `updatePointerUpData` function is resetting the pointer state when it goes up.
 */
function updatePointerUpData(pointer) {
    pointer.down = false; // Setting the pointer status to up
}

/**
 * The `correctDeltaX` function is adjusting the delta X value based on canvas aspect ratio.
 */
function correctDeltaX(delta) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio < 1) delta *= aspectRatio; // Adjusting for wide canvases
    return delta;
}

/**
 * The `correctDeltaY` function is adjusting the delta Y value based on canvas aspect ratio.
 */
function correctDeltaY(delta) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1) delta /= aspectRatio; // Adjusting for tall canvases
    return delta;
}

/**
 * The `generateColor` function is creating and returning a randomly selected color.
 * It is either generating a random HSV color or picking from predefined colors.
 */
function generateColor() {
    // Generating a random HSV color and converting it to RGB
    let c = HSVtoRGB(Math.random(), 1.0, 1.0);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;

    // Defining predefined color options
    const colors = {
        red: { r: 1.0 * 0.15, g: 0.0 * 0.15, b: 0.0 * 0.15 },
        green: { r: 0.0 * 0.15, g: 1.0 * 0.15, b: 0.0 * 0.15 },
        blue: { r: 0.0 * 0.15, g: 0.0 * 0.15, b: 1.0 * 0.15 }
    };

    // Randomly choosing one of the predefined colors
    const randomKey = Object.keys(colors)[Math.floor(Math.random() * 3)];
    const randomColor = colors[randomKey];

    // Returning the selected color
    return randomColor;
}

/**
 * The `HSVtoRGB` function is converting HSV color values to RGB format.
 * It is returning the resulting color as an object.
 */
function HSVtoRGB(h, s, v) {
    let r, g, b, i, f, p, q, t;

    // Calculating intermediate values for the conversion
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);

    // Determining the final RGB values based on the sector of the HSV space
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    // Returning the RGB color as an object
    return { r, g, b };
}

/**
 * The `normalizeColor` function is converting RGB color values from 0-255 to 0-1 range.
 * It is returning the normalized color object.
 */
function normalizeColor(input) {
    // Dividing each RGB channel value by 255
    let output = {
        r: input.r / 255,
        g: input.g / 255,
        b: input.b / 255
    };

    // Returning the normalized color
    return output;
}

/**
 * The `wrap` function is ensuring that a value wraps around a given range.
 * It is calculating and returning the wrapped value.
 */
function wrap(value, min, max) {
    // Calculating the range and ensuring wrapping
    let range = max - min;
    if (range == 0) return min;
    return (value - min) % range + min;
}

/**
 * The `getResolution` function is calculating the appropriate canvas resolution.
 * It is taking aspect ratio into account and returning the width and height.
 */
function getResolution(resolution) {
    // Calculating aspect ratio
    let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspectRatio < 1)
        aspectRatio = 1.0 / aspectRatio;

    // Determining minimum and maximum resolutions
    let min = Math.round(resolution);
    let max = Math.round(resolution * aspectRatio);

    // Returning the resolution as an object
    if (gl.drawingBufferWidth > gl.drawingBufferHeight)
        return { width: max, height: min };
    else
        return { width: min, height: max };
}

/**
 * The `getTextureScale` function is calculating the scaling factors for a texture.
 * It is comparing the texture dimensions to the target dimensions and returning the scale.
 */
function getTextureScale(texture, width, height) {
    // Calculating the scaling factors for X and Y dimensions
    return {
        x: width / texture.width,
        y: height / texture.height
    };
}

/**
 * The `scaleByPixelRatio` function is scaling an input value by the device's pixel ratio.
 * It is returning the scaled value as an integer.
 */
function scaleByPixelRatio(input) {
    // Retrieving the device pixel ratio
    let pixelRatio = window.devicePixelRatio || 1;

    // Scaling the input value and returning the result
    return Math.floor(input * pixelRatio);
}

/**
 * The `hashCode` function is generating a hash code for a given string.
 * It is using a bitwise algorithm to compute and return a 32-bit integer hash.
 */
function hashCode(s) {
    if (s.length == 0) return 0; // Returning zero for empty strings

    let hash = 0;

    // Iterating through each character and calculating the hash
    for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
        hash |= 0; // Converting to a 32-bit integer
    }

    // Returning the computed hash
    return hash;
}
