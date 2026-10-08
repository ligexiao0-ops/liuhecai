importScripts('discovery-engine.js?v=10100901');
self.onmessage=function(e){try{const r=LotteryDiscovery.run(e.data.input,e.data.maps);self.postMessage({result:r});}catch(err){self.postMessage({error:err.message});}};
