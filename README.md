<p align="center">
<img alt="" src="images/xr-logo.png" width="150px"> 
</p align="center">

# ARENA browser client (ARENA-core) 

**An environment to view and interact in multiuser virtual and augmented reality.**

| <img alt="" src="images/a1.gif">         | <img alt="" src="images/a2.gif">         |
|------------------------------------------|------------------------------------------|
| <img alt="" src="images/a3.gif">         | <img alt="" src="images/a4.gif">         |

The [ARENA](conix.io/arena) is a platform for supporting real-time mixed reality (XR) interaction between multiple users and the physical world. 

This repository contains the code for the ARENA browser client, an environment to view and interact in multiuser virtual and augmented reality. This environment was built using Web standards (notably, [WebXR](https://www.w3.org/TR/webxr/) and [WebGL](https://www.khronos.org/webgl/)) and frameworks for building 3D scenes and XR environments ([three.js](https://threejs.org/) and [A-Frame](https://aframe.io/)). 

It uses a [publish/subscribe system](https://mqtt.org/) to allow users and programs to colaborate, and takes advantage of [Jitsi](https://jitsi.org/) to support video conferencing in a 3D environment. We also take advantage of WASM‘s availability in all major browsers and other platforms outside the browser to execute distributed XR applications (the browser runtime source is [here](https://github.com/conix-center/arena-runtime-browser)).

## Documentation
The main ARENA documentation is here: [https://arena.conix.io/](https://arena.conix.io/).

[Quick Start for users](https://arena.conix.io/content/tutorials/).
[Quick Start for developers](https://arena.conix.io/content/tutorials/dev-guide.html).

## Installation

Most users will want to use an already deployed ARENA. If you want to setup you own indepent ARENA stack, you can use our [docker compose setup](https://github.com/conix-center/arena-services-docker).

## License

See the [LICENSE](LICENSE) file.
