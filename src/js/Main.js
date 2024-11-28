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

