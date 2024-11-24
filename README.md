# CSCI 596 Project: Real-time fluid simulation 
The project implements a real-time fluid dynamics algorithm based on the Navier-Stokes equations, which describe the motion of fluid substances. This algorithm is also known as the "stable fluids" method. We have used WebGL for this project. 

## Key Components of the Algorithm:-
- Advection: This step moves fluid properties (such as velocity and dye) along the velocity field. It simulates how particles in the fluid would be carried by the current flow.
- Diffusion: While not explicitly implemented in some versions, diffusion is often handled implicitly through the advection step and the use of dissipation factors. It represents how quantities spread out over time.
- Pressure Projection: This crucial step ensures the velocity field remains divergence-free, which is essential for simulating incompressible fluids like water. It helps maintain constant fluid density throughout the simulation.
- Vorticity Confinement: This technique helps preserve small-scale fluid structures and counteracts numerical dissipation, enhancing the visual appeal of the simulation1.
- External Forces: The algorithm allows for adding external forces, simulating user interaction, or other inputs that affect the fluid's behavior. 

The algorithm balances physical accuracy and computational efficiency, making it suitable for real-time applications like games and interactive simulations. It can produce visually convincing fluid-like effects, such as swirling smoke or flowing water, without requiring extremely fine grids or tiny time steps.

## Resources and Libraries Used:-
- https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API
- https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu 

