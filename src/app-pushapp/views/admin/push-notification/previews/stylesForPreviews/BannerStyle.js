export default `
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}
.preview-wrapper {
  z-index: 2;
  width: 92%;
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
.ellipsis {
  display: -webkit-box;
  -webkit-line-clamp: 2;
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
  background-color: rgb(255, 255, 255);
  /* border-radius: 20px; */
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
.road.line1, .road.line2, .road.line3, .road.line1-ban {
  margin: 6px 0;
  color: black;
}
.road.line1{
  margin: 20px 0 10px 0;
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
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-top: auto;
}
.cta-button {
  padding: 4px 8px;
  font-size: 12px;
  border: none;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
}
.banner-wrapper {
  width: 100%;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  /* margin-top: 30px; */
  padding: 0 12px;
}

.banner-content {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 10px;
}

.banner-image {
  flex-shrink: 0;
  max-width: 25%;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.banner-media-item {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
}

.banner-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.banner-buttons {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  max-width: 25%;
}
.close-btn { display: none; }`