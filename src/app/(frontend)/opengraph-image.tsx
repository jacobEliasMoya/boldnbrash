import { ImageResponse } from 'next/og'

export const alt = 'Jacob Moya | Software Engineer & Creative Developer'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: '80px',
        backgroundColor: '#080809',
        color: '#fff',
        border: '16px solid #ffc857',
      }}
    >
      <div style={{ fontSize: 108, fontWeight: 700, letterSpacing: '-5px' }}>Jacob Moya</div>
      <div style={{ fontSize: 37, color: '#ffc857' }}>Software Engineer &amp; Creative Developer</div>
    </div>,
    size,
  )
}
