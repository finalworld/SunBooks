import { useEffect, useRef } from "react";

type Ball = { x:number;y:number;vx:number;vy:number;r:number;icon:string };

export function BookEasterEgg({ onClose }: { onClose: () => void }) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=canvasRef.current!;const context=canvas.getContext("2d")!;let frame=0;
    const resize=()=>{canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio;context.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)};resize();addEventListener("resize",resize);
    const balls:Ball[]=Array.from({length:14},(_,i)=>({x:35+(i*73)%(Math.max(100,innerWidth-70)),y:50+(i*101)%(Math.max(100,innerHeight-100)),vx:(i%2?1:-1)*(2.3+(i%4)*.35),vy:(i%3?1:-1)*(2+(i%5)*.28),r:21,icon:i<7?"📖":"📕"}));
    const tick=()=>{context.clearRect(0,0,innerWidth,innerHeight);for(const ball of balls){ball.x+=ball.vx;ball.y+=ball.vy;if(ball.x-ball.r<0||ball.x+ball.r>innerWidth)ball.vx*=-1;if(ball.y-ball.r<0||ball.y+ball.r>innerHeight)ball.vy*=-1;ball.x=Math.max(ball.r,Math.min(innerWidth-ball.r,ball.x));ball.y=Math.max(ball.r,Math.min(innerHeight-ball.r,ball.y))}for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){const a=balls[i],b=balls[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.r+b.r;if(d>0&&d<min){const nx=dx/d,ny=dy/d,p=2*(a.vx*nx+a.vy*ny-b.vx*nx-b.vy*ny)/2;a.vx-=p*nx;a.vy-=p*ny;b.vx+=p*nx;b.vy+=p*ny;const overlap=(min-d)/2;a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap}}context.font="38px system-ui";context.textAlign="center";context.textBaseline="middle";for(const ball of balls)context.fillText(ball.icon,ball.x,ball.y);frame=requestAnimationFrame(tick)};tick();const timer=setTimeout(onClose,25000);return()=>{cancelAnimationFrame(frame);clearTimeout(timer);removeEventListener("resize",resize)}},[onClose]);
  return <button className="easter-egg" onClick={onClose} aria-label="Close easter egg"><canvas ref={canvasRef}/></button>;
}
