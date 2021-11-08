# Vorld

Vorld is a set of scripts for generating voxel worlds using web technologies.

The definition of the 'vorld' is stored purely as data to facilitate use of web workers. 

Methods to query and operate on this data are module functions rather than on the vorld data object instances.

## Suggested Usuage
Include repo as submodule and use Common JS: e.g. `require('./vorld/core/vorld')`

## Build Workers
`browserify meshing/worker.js -o mesher-worker.js`

`browserify lighting/worker.js -o lighting-worker.js`

`browserify generation/worker.js -o generation-worker.js`