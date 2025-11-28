document.addEventListener('DOMContentLoaded', function() {
    // 獲取所有必要的 DOM 元素
    const questionForm = document.getElementById('questionForm');
    const questionContentDiv = document.getElementById('questionContent');
    const imageDataInput = document.getElementById('imageData');
    const imageTypeInput = document.getElementById('imageType');
    const statusDiv = document.getElementById('status');
    const debugDiv = document.getElementById('debugInfo');
    const screenshotHelperButton = document.getElementById('screenshotHelper'); // 新增的按鈕變數

    // 1. 獲取 Tableau URL 參數
    const urlParams = new URLSearchParams(window.location.search);
    const tableauUser = urlParams.get('userName') || 'Unknown User'; 
    const dashboardId = urlParams.get('dashboardName') || 'Unknown Dashboard';
    
    // 填充隱藏欄位和除錯資訊
    document.getElementById('tableauUser').value = tableauUser;
    document.getElementById('dashboardId').value = dashboardId;
    debugDiv.innerHTML = `已連結報表: ${dashboardId} | 使用者: ${tableauUser}`;

    // --- 輔助按鈕邏輯 (新增) ---
    if (screenshotHelperButton) {
        screenshotHelperButton.addEventListener('click', function() {
            // 1. 提醒使用者操作系統的截圖快捷鍵
            alert("請使用以下快捷鍵截取 Tableau 畫面：\n\nWindows: Win + Shift + S\nMac: Command + Shift + 4\n\n截圖完成後，請將圖片貼回下方的提問框。");
            
            // 2. 將焦點設定到可編輯的提問框，讓使用者可以直接貼上
            questionContentDiv.focus();
        });
    }


    // --- 2. 關鍵：圖片貼上和 Base64 轉換邏輯 ---

    let finalBase64String = ''; 
    let finalImageType = '';   

    questionContentDiv.addEventListener('paste', function(e) {
        console.log('偵測到貼上事件。');
        
        // 每次貼上時，清除舊狀態並準備好數據接收
        finalBase64String = ''; 
        finalImageType = '';
        imageDataInput.value = '';
        imageTypeInput.value = '';
        statusDiv.innerHTML = '正在處理貼上內容...';
        
        // 🚨 儲存目前文字，以便貼圖後重新插入
        const currentText = questionContentDiv.innerText.trim();
        questionContentDiv.innerHTML = ''; // 清空內容，準備顯示圖片佔位符

        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        let imageFound = false;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault(); // 阻止瀏覽器預設貼上行為
                imageFound = true;
                const file = item.getAsFile();
                
                if (!file) {
                    console.error('無法獲取圖片文件對象。');
                    statusDiv.innerHTML = '❌ 無法獲取圖片文件對象。';
                    continue;
                }
                
                // 檢查文件大小，防止 Payload 超限 (建議 4MB)
                const MAX_SIZE_BYTES = 4000000; 
                if (file.size > MAX_SIZE_BYTES) {
                    statusDiv.innerHTML = '❌ 截圖檔案過大 (超過 4MB)，請截取較小範圍。';
                    return;
                }
                
                console.log(`偵測到圖片文件: ${file.type}, 大小: ${file.size}`);

                const reader = new FileReader();
                
                reader.onload = function(event) {
                    const base64DataURL = event.target.result;
                    const parts = base64DataURL.split(',');
                    
                    if (parts.length > 1) {
                        finalBase64String = parts[1]; 
                        finalImageType = file.type;
                        
                        // 更新隱藏欄位
                        imageDataInput.value = finalBase64String;
                        imageTypeInput.value = finalImageType;
                        
                        console.log('✅ Base64 轉換成功，隱藏欄位已更新。');
                        
                        // 顯示佔位符
                        const imgPlaceholder = document.createElement('img');
                        imgPlaceholder.src = event.target.result;
                        imgPlaceholder.style.maxWidth = '100%';
                        imgPlaceholder.style.height = 'auto';
                        imgPlaceholder.title = '截圖已捕獲 (Base64)';
                        
                        // 重新插入文字和圖片
                        questionContentDiv.innerHTML = (currentText ? currentText + '<br>' : ''); 
                        questionContentDiv.appendChild(imgPlaceholder);
                        questionContentDiv.appendChild(document.createElement('br'));
                        
                        statusDiv.innerHTML = '✅ 截圖已捕獲！請繼續輸入問題。';
                    } else {
                        console.error('數據 URL 格式錯誤。');
                        statusDiv.innerHTML = '❌ 圖片數據提取失敗。';
                    }
                };
                
                reader.onerror = function() {
                    console.error('FileReader 讀取失敗。');
                    statusDiv.innerHTML = '❌ 圖片讀取失敗。';
                };
                
                reader.readAsDataURL(file);
                break; // 只處理第一張圖片
            }
        }
        
        if (!imageFound) {
            // 如果沒有圖片，則將之前清除的文字重新放回，並允許文本正常貼上
            questionContentDiv.innerHTML = currentText; 
            statusDiv.innerHTML = 'ℹ️ 僅貼上了文字。';
        }
    });


    // --- 3. 表單提交邏輯 (發送到 Make) ---

    questionForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // 提取純文本問題內容
        const questionText = questionContentDiv.innerText.trim();
        
        // 檢查必須有文本或圖片數據
        if (!questionText && !imageDataInput.value) {
            statusDiv.innerHTML = '請輸入提問內容或貼上截圖！';
            return;
        }

        // 替換成你的實際 Make Webhook URL
        const webhookUrl = 'YOUR_MAKE_WEBHOOK_URL_HERE'; 
        
        // 構造基本 Payload
        let payload = {
            question_text: questionText,
            department_id: document.getElementById('dept').value,
            dashboard_id: dashboardId,
            tableau_user: tableauUser,
        };

        // *** 關鍵修正：僅在有 Base64 數據時，才加入圖片欄位 ***
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
