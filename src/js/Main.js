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
