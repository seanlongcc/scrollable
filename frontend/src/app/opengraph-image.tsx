import { ImageResponse } from "next/og";

import { siteDescription, siteName } from "@/lib/seo";

const instrumentSerifUrl =
  "https://fonts.gstatic.com/s/instrumentserif/v5/jizBRFtNs2ka5fXjeivQ4LroWlx-2zI.ttf";
const soraRegularUrl =
  "https://fonts.gstatic.com/s/sora/v17/xMQOuFFYT72X5wkB_18qmnndmSdSnn-K.ttf";
const soraBoldUrl =
  "https://fonts.gstatic.com/s/sora/v17/xMQOuFFYT72X5wkB_18qmnndmSe1mX-K.ttf";

export const alt = `${siteName} preview`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const [instrumentSerif, soraRegular, soraBold] = await Promise.all([
    fetchFont(instrumentSerifUrl),
    fetchFont(soraRegularUrl),
    fetchFont(soraBoldUrl),
  ]);

  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#1b151a",
        color: "#fff7f1",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        padding: 64,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minHeight: 502,
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 32,
            width: "100%",
          }}
        >
          <div
            style={{
              color: "#f28f98",
              display: "flex",
              fontFamily: "Sora",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 0,
            }}
          >
            Multi-view reels-style feeds
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Instrument Serif",
              fontSize: 146,
              fontWeight: 400,
              letterSpacing: 0,
              lineHeight: 0.9,
            }}
          >
            scrollable.app
          </div>
          <div
            style={{
              color: "#d7c6bd",
              display: "flex",
              fontFamily: "Sora",
              fontSize: 34,
              fontWeight: 400,
              lineHeight: 1.35,
              maxWidth: 760,
            }}
          >
            {siteDescription}
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Instrument Serif",
          data: instrumentSerif,
          style: "normal",
          weight: 400,
        },
        {
          name: "Sora",
          data: soraRegular,
          style: "normal",
          weight: 400,
        },
        {
          name: "Sora",
          data: soraBold,
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}

async function fetchFont(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load social image font: ${url}`);
  }

  return response.arrayBuffer();
}
