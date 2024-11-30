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


///rahul///
