export default `
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}
.preview-wrapper {
  z-index: 2;
  border-radius: 18px;
  width: 92%;
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  background-color: rgba(30, 30, 30, 0.94);
  color: white;
  padding: 14px 16px;
  position: absolute;
  bottom: 80px;
}
.line1, .line2, .line3 {
  margin-bottom: 2px;
}
.ellipsisi {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pop-up-dimensions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  /* max-width: 380px; */
  /* aspect-ratio: 9 / 16; */
  height: 100%;
  background-color: rgb(255, 255, 255);
  border-radius: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.pop-up-vertical-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 16px;
  width: 100%;
  height: 100%;
  gap: 10px;
  flex: 1;
  text-align: center;
  overflow-y: auto;
}
.text-block-road {
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 14px;
}
.road.line1, .road.line2, .road.line3 {
  margin: 6px 0;
  color: black;
}
.road.line1{
  margin: 30px 0 10px 0;
  color: black;
}
.media-preview {
  width: 100%;
  aspect-ratio: 3 / 4;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border-radius: 8px;
  background-color: transparent;
}

.media-preview .media-item {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}
video::-webkit-media-controls { 
    display: none !important; 
}
.cta-button-group {
  display: flex;
  flex-direction: row;
  gap: 10px;
  width: 100%;
  margin-top: auto;
}

.cta-button {
  width: 100%;
  padding: 10px;
  font-size: 14px;
  border: none;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
}
.carousel-wrapper {
  width: 100%;
  aspect-ratio: 3 / 4;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}
.media-carousel {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}
.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #888;
  opacity: 0.5;
  transition: all 0.3s ease;
  cursor: pointer;
}

.dot.active {
  background-color: rgb(59, 58, 58);
  opacity: 1;
}
.close-btn { display: none; }`