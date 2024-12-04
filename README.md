# 🚀🚀 CSCI 596 Project(Fall 24): Real-Time Fluid Simulation using Navier-Stokes Algorithm

## 📋📋 Introduction and Objective
The project implements a real-time fluid dynamics algorithm based on the Navier-Stokes equations, which describe the motion of fluid substances. This algorithm is also known as the "stable fluids" method. We have used WebGL for this project. This is part of the final project for the course CSCI 596 for Fall 24. 

## ⚙️⚙️ Key Components of Navier-Stokes Algorithm
- **Advection**: This step moves fluid properties (such as velocity and dye) along the velocity field. It simulates how particles in the fluid would be carried by the current flow.
- **Diffusion**: The diffusion term quantifies a fluid's resistance to flow; for example, molasses flows more slowly than alcohol due to its higher viscosity.
- **Pressure**: This step ensures the velocity field remains divergence-free, which is essential for simulating incompressible fluids like water. It helps maintain constant fluid density throughout the simulation.
- **Vorticity Confinement**: This helps preserve small-scale fluid structures and counteracts numerical dissipation. 
- **External Forces**: This represents an acceleration from external forces, either local (e.g. a fan blowing air) or body forces (e.g. gravity).

## 🎮🌦️ Applications
- The algorithm balances physical accuracy and computational efficiency without requiring extremely fine grids or tiny time steps.
- Entertainment/Games: It is suitable for real-time applications like games to produce visually convincing fluid-like effects, such as swirling smoke or flowing water.
- Healthcare: It can be used for blood flow analysis and drug delivery simulation in healthcare animations.
- Weather: It can be used in climate modeling and weather forecasting animations.

## 🎬🎬 Demo
You can experience the live demo here.

## 👩‍💻👨‍💻 Group Members
- Parth Rohilla
- Soham Khade
- Nishthavan Dahiya
- Darsh Patel
- Rahul Aggarwal

## 🔗🔗 Resources and Libraries Used
- https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API
- https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu 

