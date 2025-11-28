document.addEventListener('DOMContentLoaded', function() {
    // 獲取所有必要的 DOM 元素
    const questionForm = document.getElementById('questionForm');
    const questionContentDiv = document.getElementById('questionContent');
    const imageDataInput = document.getElementById('imageData');
    const imageTypeInput = document.getElementById('imageType');
    const statusDiv = document.getElementById('status');
    const debugDiv = document.getElementById('debugInfo');
    const screenshotHelperButton = document.getElementById('screenshotHelper');
    const canvas = document.getElementById('screenshotCanvas'); // 用於 getDisplayMedia 轉換

    // 1. 獲取 Tableau URL 參數 (靜態變數)
    const urlParams = new URLSearchParams(window.location.search);
    const tableauUser = urlParams.get('userName') || 'Unknown User'; 
    const dashboardId = urlParams.get('dashboardName') || 'Unknown Dashboard';
    
    // 填充隱藏欄位和除錯資訊
    document.getElementById('tableauUser').value = tableauUser;
    document.getElementById('dashboardId').value = dashboardId;
    debugDiv.innerHTML = `已連結報表: ${dashboardId} | 使用者: ${tableauUser}`;

    // 儲存 Base64 數據的狀態
    let finalBase64String = ''; 
    let finalImageType = '';   
    
    // ----------------------------------------------------
    // I. 程式化擷取畫面邏輯 (getDisplayMedia)
    // ----------------------------------------------------

    async function startCapture() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            statusDiv.innerHTML = '❌ 您的瀏覽器不支援螢幕擷取 API。';
            return;
        }

        statusDiv.innerHTML = '請在彈出視窗中選擇螢幕或 Tableau 視窗...';

        try {
            // 請求螢幕分享權限和串流 (此處會彈出瀏覽器安全視窗)
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
                
                // 儲存數據
                finalBase64String = dataURL.split(',')[1];
                finalImageType = 'image/png';

                imageDataInput.value = finalBase64String;
                imageTypeInput.value = finalImageType;

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

    // 按鈕：觸發自動擷取
    if (screenshotHelperButton) {
        screenshotHelperButton.addEventListener('click', startCapture);
    }
    
    
    // ----------------------------------------------------
    // II. 手動貼上邏輯 (Ctrl+V) - 作為自動擷取的備援
    // ----------------------------------------------------

    questionContentDiv.addEventListener('paste', function(e) {
        console.log('偵測到手動貼上事件。');
        
        // 清除舊狀態
        finalBase64String = ''; 
        finalImageType = '';
        imageDataInput.value = '';
        imageTypeInput.value = '';
        
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        let imageFound = false;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault(); // 阻止瀏覽器預設行為
                imageFound = true;
                const file = item.getAsFile();
                
                if (!file) continue;

                const MAX_SIZE_BYTES = 4000000; 
                if (file.size > MAX_SIZE_BYTES) {
                    statusDiv.innerHTML = '❌ 截圖檔案過大 (超過 4MB)，請截取較小範圍。';
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(event) {
                    const base64DataURL = event.target.result;
                    const parts = base64DataURL.split(',');
                    
                    if (parts.length > 1) {
                        finalBase64String = parts[1]; 
                        finalImageType = file.type;
                        
                        imageDataInput.value = finalBase64String;
                        imageTypeInput.value = finalImageType;
                        
                        // 顯示佔位符
                        const imgPlaceholder = document.createElement('img');
                        imgPlaceholder.src = event.target.result;
                        imgPlaceholder.style.maxWidth = '100%';
                        questionContentDiv.innerHTML = ''; 
                        questionContentDiv.appendChild(imgPlaceholder);
                        questionContentDiv.appendChild(document.createElement('br'));
                        
                        statusDiv.innerHTML = '✅ 截圖已捕獲！請繼續輸入問題。';
                    }
                };
                reader.readAsDataURL(file);
                break;
            }
        }
        
        if (!imageFound) {
            statusDiv.innerHTML = 'ℹ️ 僅貼上了文字。';
        }
    });


    // ----------------------------------------------------
    // III. 表單提交邏輯 (最終發送)
    // ----------------------------------------------------

    questionForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // 提取純文本問題內容 (包含圖片上下的文字)
        const questionText = questionContentDiv.innerText.trim();
        
        // 檢查必須有文本或圖片數據
        if (!questionText && !imageDataInput.value) {
            statusDiv.innerHTML = '請輸入提問內容或貼上截圖！';
            return;
        }

        const webhookUrl = 'YOUR_MAKE_WEBHOOK_URL_HERE'; 
        
        // 構造基本 Payload
        let payload = {
            question_text: questionText,
            department_id: document.getElementById('dept').value,
            dashboard_id: dashboardId, 
            tableau_user: tableauUser,
        };

        // 關鍵修正：僅在有 Base64 數據時，才加入圖片欄位
        if (imageDataInput.value) {
            payload.image_data_base64 = imageDataInput.value;
            payload.image_mime_type = imageTypeInput.value || 'image/png'; 
        }
        
        console.log('Payload sent:', payload); 
        statusDiv.innerHTML = '正在發送...';

        // 發送 POST 請求到 Make Webhook
        fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Webhook 處理失敗');
            }
            return response.json(); 
        })
        .then(data => {
            statusDiv.innerHTML = '✅ 問題與截圖已成功提交到 Slack！';
            // 提交成功後清除表單
            questionForm.reset();
            questionContentDiv.innerHTML = '';
            imageDataInput.value = '';
            imageTypeInput.value = '';
        })
        .catch(error => {
            console.error('提交錯誤:', error);
            statusDiv.innerHTML = '❌ 提交失敗，請檢查網路或聯繫 IT 部門。';
        });
    });
});
