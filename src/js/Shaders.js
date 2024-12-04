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


const checkerboardShader = createShader(gl.FRAGMENT_SHADER, `
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
