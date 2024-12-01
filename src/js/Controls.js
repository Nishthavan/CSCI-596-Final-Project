function changeDensityControl() { // change Density Dissipation Value
    const densityControl = document.getElementById("densityControl");
    console.log("Density Dissipation value:", densityControl.value);
    config.DENSITY_DISSIPATION = densityControl.value;
}

function changeVelocityControl(){ // change Velocity Dissipation Value
    const velocityControl = document.getElementById("velocityControl");
    console.log("Velocity Dissipation value:", velocityControl.value);
    config.VELOCITY_DISSIPATION = velocityControl.value;
}

function changePressureControl(){ // change Pressure Value
    const pressureControl = document.getElementById("pressureControl");
    console.log("Pressure value:", pressureControl.value);
    config.PRESSURE = pressureControl.value;
}

function changeVorticityControl(){ // change CURL Value
    const vorticityControl = document.getElementById("vorticityControl");
    console.log("Vorticity value:", vorticityControl.value);
    config.CURL = vorticityControl.value;
}

function changeSplatRadiusControl(){
    const splatRadiusControl = document.getElementById("splatRadiusControl");
    console.log("Splat Radius value:", splatRadiusControl.value);
    config.SPLAT_RADIUS = splatRadiusControl.value;
}

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


// Some of the Shaders:

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

