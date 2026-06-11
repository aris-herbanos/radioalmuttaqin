"use client";

import Script from "next/script";

export default function Ads() {
  return (
    <div className="my-10 p-4 bg-slate-50 border-y border-slate-100 flex justify-center overflow-hidden rounded-[4px]">
      {/* Script eksternal AmalSholeh.com */}
      <Script 
        src="https://donasi.amalsholeh.com/widget/script.js" 
        strategy="afterInteractive" 
      />
      
      {/* Render Widget Donasi */}
      <article 
        className="as-program-card mx-auto" 
        data-slug="dakwah" 
        data-type="Donasi" 
        data-title="Infak Syiar Dakwah Islam" 
        data-headline="Ayo Berdonasi untuk Syiar Dakwah Islam! Infak Anda bantu sebar cahaya Islam lewat pendidikan, media dakwah, dan aksi sosial." 
        data-image="https://amalsholeh-s3.imgix.net/cover/j5nx71eUTJH5rn7BOSQXJhsejsUcvmqKZSg1kbFH.png?w=385&fit=crop&auto=format,compress"  
        data-user="YAYASAN PENDIDIKAN ISLAM DAN ASUHAN ANAK YATIM IHYAUS SUNNAH" 
        data-avatar="null?ar=1:1&w=80&fit=crop&auto=format,compress"
      >
      </article>
    </div>
  );
}