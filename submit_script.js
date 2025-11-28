document.addEventListener('DOMContentLoaded', function() {
    const questionForm = document.getElementById('questionForm');
    const questionContentDiv = document.getElementById('questionContent');
    const imageDataInput = document.getElementById('imageData');
    const imageTypeInput = document.getElementById('imageType');
    const statusDiv = document.getElementById('status');
    const screenshotHelperButton = document.getElementById('screenshotHelper');
    const canvas = document.getElementById('screenshotCanvas');

    // ... [可疑連結已刪除] ...
    const urlParams = new URLSearchParams(window.location.search);
    const tableauUser = urlParams.get('userName') || 'Unknown User'; 
    const dashboardId = urlParams.get('dashboardName') || 'Unknown Dashboard';
    
    document.getElementById('tableauUser').value = tableauUser;
    document.getElementById('dashboardId').value = dashboardId;
    debugDiv.innerHTML = `已連結報表: ${dashboardId} | 使用者: ${tableauUser}`;


    // --- I. 核心：程式化擷取畫面函數 ---

    async function startCapture() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            statusDiv.innerHTML = '❌ 您的瀏覽器不支援螢幕擷取 API。';
            return;
        }

        statusDiv.innerHTML = '請在彈出視窗中選擇螢幕或 Tableau 視窗...';

        try {
            // 請求螢幕分享權限和串流
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { mediaSource: 'screen' },
                audio: false
            });

            const video = document.createElement('video');
            video.autoplay = true;
            video.srcObject = stream;

            video.onloadedmetadata = () => {
                // 將視訊串流繪製到 Canvas
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // 停止串流
                stream.getTracks().forEach(track => track.stop());

                // 轉換 Canvas 內容為 Base64 (PNG 格式)
                const dataURL = canvas.toDataURL('image/png');
                const base64String = dataURL.split(',')[1];
                
                // 儲存數據
                imageDataInput.value = base64String;
                imageTypeInput.value = 'image/png';

                // 在輸入框顯示圖片佔位符
                const imgPlaceholder = document.createElement('img');
                imgPlaceholder.src = dataURL;
                imgPlaceholder.style.maxWidth = '100%';
                imgPlaceholder.style.height = 'auto';
                
                questionContentDiv.innerHTML = '';
                questionContentDiv.appendChild(imgPlaceholder);
                
                statusDiv.innerHTML = '✅ 畫面已擷取，可提交！';
            };

        } catch (err) {
            console.error("螢幕擷取失敗:", err);
            statusDiv.innerHTML = '❌ 擷取失敗或被取消，請重試。';
        }
    }

    // --- II. 按鈕觸發與貼上邏輯 (保持原有貼上功能) ---

    // 按鈕邏輯：點擊觸發自動擷取
    if (screenshotHelperButton) {
        screenshotHelperButton.addEventListener('click', startCapture);
    }
    
    // 貼上邏輯 (保留 Ctrl+V 貼上的功能，以防萬一)
    // ... [請將您之前正確的 'paste' 事件監聽器程式碼塊貼在這裡] ...
    // ... [由於篇幅限制，請確保您的 'paste' 邏輯在此處] ...


    // --- III. 表單提交邏輯 ---

    questionForm.addEventListener('submit', function(e) {
        // ... [使用前面提供的 'submit' 邏輯] ...
        e.preventDefault();

        const questionText = questionContentDiv.innerText.trim();
        
        if (!questionText && !imageDataInput.value) {
            statusDiv.innerHTML = '請輸入提問內容或貼上截圖！';
            return;
        }

        // ... [其餘的提交邏輯 (Payload 構造、fetch 呼叫) 保持不變] ...
        // ... [請將您的 'submit' 處理程序貼在這裡，並確保 webhookUrl 正確] ...
    });
});
