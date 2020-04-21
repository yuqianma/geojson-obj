parcelRequire=function(e,r,t,n){var i,o="function"==typeof parcelRequire&&parcelRequire,u="function"==typeof require&&require;function f(t,n){if(!r[t]){if(!e[t]){var i="function"==typeof parcelRequire&&parcelRequire;if(!n&&i)return i(t,!0);if(o)return o(t,!0);if(u&&"string"==typeof t)return u(t);var c=new Error("Cannot find module '"+t+"'");throw c.code="MODULE_NOT_FOUND",c}p.resolve=function(r){return e[t][1][r]||r},p.cache={};var l=r[t]=new f.Module(t);e[t][0].call(l.exports,p,l,l.exports,this)}return r[t].exports;function p(e){return f(p.resolve(e))}}f.isParcelRequire=!0,f.Module=function(e){this.id=e,this.bundle=f,this.exports={}},f.modules=e,f.cache=r,f.parent=o,f.register=function(r,t){e[r]=[function(e,r){r.exports=t},{}]};for(var c=0;c<t.length;c++)try{f(t[c])}catch(e){i||(i=e)}if(t.length){var l=f(t[t.length-1]);"object"==typeof exports&&"undefined"!=typeof module?module.exports=l:"function"==typeof define&&define.amd?define(function(){return l}):n&&(this[n]=l)}if(parcelRequire=f,i)throw i;return f}({"AM54":[function(require,module,exports) {
function e(e,n,o){return e[0]=n[0]+o[0],e[1]=n[1]+o[1],e}module.exports=e;
},{}],"bgI3":[function(require,module,exports) {
function e(e,n,o){return e[0]=n,e[1]=o,e}module.exports=e;
},{}],"kIIr":[function(require,module,exports) {
function r(r,t){var e=t[0],n=t[1],o=e*e+n*n;return o>0&&(o=1/Math.sqrt(o),r[0]=t[0]*o,r[1]=t[1]*o),r}module.exports=r;
},{}],"IYgp":[function(require,module,exports) {
function e(e,n,o){return e[0]=n[0]-o[0],e[1]=n[1]-o[1],e}module.exports=e;
},{}],"eAVm":[function(require,module,exports) {
function e(e,n){return e[0]*n[0]+e[1]*n[1]}module.exports=e;
},{}],"pfGz":[function(require,module,exports) {
var e=require("gl-vec2/add"),r=require("gl-vec2/set"),t=require("gl-vec2/normalize"),u=require("gl-vec2/subtract"),o=require("gl-vec2/dot"),i=[0,0];module.exports.computeMiter=function(u,n,c,l,d){return e(u,c,l),t(u,u),r(n,-u[1],u[0]),r(i,-c[1],c[0]),d/o(n,i)},module.exports.normal=function(e,t){return r(e,-t[1],t[0]),e},module.exports.direction=function(e,r,o){return u(e,r,o),t(e,e),e};
},{"gl-vec2/add":"AM54","gl-vec2/set":"bgI3","gl-vec2/normalize":"kIIr","gl-vec2/subtract":"IYgp","gl-vec2/dot":"eAVm"}],"Focm":[function(require,module,exports) {
var e=require("polyline-miter-util"),r=[0,0],i=[0,0],l=[0,0],n=[0,0];function t(e,r,i){e.push([[r[0],r[1]],i])}module.exports=function(o,u){var c=null,a=[];u&&(o=o.slice()).push(o[0]);for(var p=o.length,m=1;m<p;m++){var s=o[m-1],v=o[m],d=m<o.length-1?o[m+1]:null;if(e.direction(r,v,s),c||(c=[0,0],e.normal(c,r)),1===m&&t(a,c,1),d){e.direction(i,d,v);var f=e.computeMiter(l,n,r,i,1);t(a,n,f)}else e.normal(c,r),t(a,c,1)}if(o.length>2&&u){var h=o[p-2],g=o[0],M=o[1];e.direction(r,g,h),e.direction(i,M,g),e.normal(c,r);var q=e.computeMiter(l,n,r,i,1);a[0][0]=n.slice(),a[p-1][0]=n.slice(),a[0][1]=q,a[p-1][1]=q,a.pop()}return a};
},{"polyline-miter-util":"pfGz"}],"UhAT":[function(require,module,exports) {
var r=require("polyline-normals");try{window.getNormals=r}catch(a){}
},{"polyline-normals":"Focm"}]},{},["UhAT"], null)