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

