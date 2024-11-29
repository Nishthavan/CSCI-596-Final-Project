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

// Some Util Funcs...
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
