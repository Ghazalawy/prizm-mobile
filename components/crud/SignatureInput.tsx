import { useMemo, useRef } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";

type SignatureInputProps = {
  value: string;
  onChange: (value: string) => void;
};

/** Handwritten PNG signature pad. Drawing stays inside the WebView canvas;
 * React receives one data URL only when a stroke finishes. */
export function SignatureInput({ value, onChange }: SignatureInputProps) {
  const html = useMemo(() => signatureHtml(), []);
  const webView = useRef<WebView>(null);
  return (
    <View>
      <View className="h-44 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <WebView
          ref={webView}
          originWhitelist={["*"]}
          source={{ html }}
          javaScriptEnabled
          scrollEnabled={false}
          overScrollMode="never"
          onMessage={(event) => {
            const data = event.nativeEvent.data;
            if (data === "clear") onChange("");
            else if (data.startsWith("data:image/png;base64,")) onChange(data);
          }}
          style={{ backgroundColor: "transparent" }}
        />
      </View>
      <View className="mt-2 flex-row items-center">
        <Text className={`flex-1 text-xs ${value ? "text-green-700" : "text-muted"}`}>
          {value ? "Signature captured" : "Sign inside the box"}
        </Text>
        <TouchableOpacity onPress={() => {
          webView.current?.injectJavaScript("window.clearPad && window.clearPad(); true;");
          onChange("");
        }} className="rounded-lg bg-gray-100 px-3 py-2">
          <Text className="text-sm font-medium text-foreground">Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function signatureHtml() {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>
  *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#fff;touch-action:none}canvas{display:block;width:100%;height:100%;touch-action:none}
  </style></head><body><canvas id="pad"></canvas><script>
  const canvas=document.getElementById('pad'),ctx=canvas.getContext('2d');let drawing=false,last=null;
  function resize(){const dpr=window.devicePixelRatio||1,r=canvas.getBoundingClientRect();canvas.width=r.width*dpr;canvas.height=r.height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineWidth=2.2;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#0f172a'}
  function point(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
  canvas.addEventListener('pointerdown',e=>{drawing=true;last=point(e);canvas.setPointerCapture(e.pointerId);e.preventDefault()});
  canvas.addEventListener('pointermove',e=>{if(!drawing)return;const p=point(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;e.preventDefault()});
  function finish(e){if(!drawing)return;drawing=false;last=null;window.ReactNativeWebView.postMessage(canvas.toDataURL('image/png'));e.preventDefault()}
  window.clearPad=()=>ctx.clearRect(0,0,canvas.width,canvas.height);canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);window.addEventListener('resize',resize);resize();
  </script></body></html>`;
}
