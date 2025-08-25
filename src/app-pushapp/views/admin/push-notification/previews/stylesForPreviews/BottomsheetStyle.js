export default `
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}
.preview-wrapper {
  z-index: 2;
  width: 100%;
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
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.bottomsheet-block{
  width: 100%;
  height: 100%;
}
.pop-up-vertical-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 6px 14px 14px 14px;
  width: 92%;
  height: 92%;
  gap: 10px;
  flex: 1;
  text-align: center;
  overflow-y: auto;
}
.text-block-road {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
}
.road.line1, .road.line2, .road.line3 {
  margin: 4px 0 2px 0;
  color: black;
  /* display: flex;
  align-items: center;
  justify-content: center; */
}
.media-preview {
  max-height: 100%;
  aspect-ratio: 4 / 3;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border-radius: 8px;
  background-color: #000;
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
  margin-top: 3px;
}

.cta-button {
  width: 100%;
  padding: 6px 8px;
  font-size: 10px;
  border: none;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
}
.close-btn { display: none; }`