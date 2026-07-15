import{b as y,c as x,d as f,e as S,r as n,_ as j,f as l,j as e,M as w,L as k,O as g,S as M}from"./components-BNZ-ZKTZ.js";/**
 * @remix-run/react v2.17.5
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */let a="positions";function O({getKey:r,...c}){let{isSpaMode:p}=y(),o=x(),u=f();S({getKey:r,storageKey:a});let h=n.useMemo(()=>{if(!r)return null;let t=r(o,u);return t!==o.key?t:null},[]);if(p)return null;let d=((t,m)=>{if(!window.history.state||!window.history.state.key){let s=Math.random().toString(32).slice(2);window.history.replaceState({key:s},"")}try{let i=JSON.parse(sessionStorage.getItem(t)||"{}")[m||window.history.state.key];typeof i=="number"&&window.scrollTo(0,i)}catch(s){console.error(s),sessionStorage.removeItem(t)}}).toString();return n.createElement("script",j({},c,{suppressHydrationWarning:!0,dangerouslySetInnerHTML:{__html:`(${d})(${l(JSON.stringify(a))}, ${l(JSON.stringify(h))})`}}))}const L=()=>[];function R(){return e.jsxs("html",{children:[e.jsxs("head",{children:[e.jsx("meta",{charSet:"utf-8"}),e.jsx("meta",{name:"viewport",content:"width=device-width,initial-scale=1"}),e.jsx("link",{rel:"preconnect",href:"https://cdn.shopify.com/"}),e.jsx("link",{rel:"stylesheet",href:"https://unpkg.com/@shopify/polaris@12.0.0/build/esm/styles.css"}),e.jsx(w,{}),e.jsx(k,{})]}),e.jsxs("body",{children:[e.jsx(g,{}),e.jsx(O,{}),e.jsx(M,{})]})]})}export{R as default,L as links};
