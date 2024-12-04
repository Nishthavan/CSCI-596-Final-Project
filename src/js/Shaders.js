// Material Class for Shaders...

class ShaderMaterial {
    constructor(vertexSrc, fragSrc) {
        this.vertexSrc = vertexSrc;
        this.fragSrc = fragSrc;
        this.compiledPrograms = [];
        this.currentProgram = null;
        this.uniformLocations = [];
    }

    applyKeywords(keywordList) {
        let uniqueHash = keywordList.reduce((accum, keyword) => accum + hashCode(keyword), 0);
        let programInstance = this.compiledPrograms[uniqueHash];
        if (!programInstance) {
            // const fragShader = createShader(gl.FRAGMENT_SHADER, this.fragSrc, keywordList);
            programInstance = generateProgram(this.vertexSrc, fragShader);
            this.compiledPrograms[uniqueHash] = programInstance;
        }

        if (programInstance === this.currentProgram) return;
        this.uniformLocations = extractUniforms(programInstance);
        this.currentProgram = programInstance;
    }

    activate() {
        gl.useProgram(this.currentProgram);
    }
}

// Shader Program Class
class ShaderProgram {
    constructor(vertexSource, fragSource) {
        this.uniformMap = {};
        this.programID = generateProgram(vertexSource, fragSource);
        this.uniformMap = extractUniforms(this.programID);
    }
    activate() {
        gl.useProgram(this.programID);
    }
}

// Function to Create Shaders
function createShader(shaderType, sourceCode, keywordArray) {
    const updatedSource = appendKeywords(sourceCode, keywordArray);

    const shaderObj = gl.createShader(shaderType);
    gl.shaderSource(shaderObj, updatedSource);
    gl.compileShader(shaderObj);

    if (!gl.getShaderParameter(shaderObj, gl.COMPILE_STATUS)) {
        console.trace(gl.getShaderInfoLog(shaderObj));
    }

    return shaderObj;
}


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
const baseVertexShader = createShader(gl.VERTEX_SHADER, `
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

const blurVertexShader = createShader(gl.VERTEX_SHADER, `
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

const blurShader = createShader(gl.FRAGMENT_SHADER, `
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

const copyShader = createShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
        gl_FragColor = texture2D(uTexture, vUv);
    }
`);

const clearShader = createeShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;

    void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
    }
`);

const colorShader = createShader(gl.FRAGMENT_SHADER, `
    precision mediump float;

    uniform vec4 color;

    void main () {
        gl_FragColor = color;
    }
`);
