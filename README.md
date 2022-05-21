# Vorld

Vorld is a set of scripts for generating voxel worlds using web technologies.

The definition of the 'vorld' is stored purely as data to facilitate use of web workers. 

Methods to query and operate on this data are module functions rather than on the vorld data object instances.

## Suggested Usuage
Use Common JS / browserify/

Add `vorld: delphic/vorld` to your package dependencies and `require('vorld')`.

Or include repo as submodule and `require('./vorld')`.

## Build Worker
`browserify scripts/worker.js -o worker.js`