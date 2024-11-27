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
            const fragShader = createShader(gl.FRAGMENT_SHADER, this.fragSrc, keywordList);
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

