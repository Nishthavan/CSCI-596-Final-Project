



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