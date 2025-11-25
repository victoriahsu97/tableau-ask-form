document.addEventListener('DOMContentLoaded', function() {
    const questionForm = document.getElementById('questionForm');
    const questionContentDiv = document.getElementById('questionContent');
    const imageDataInput = document.getElementById('imageData');
    const imageTypeInput = document.getElementById('imageType');
    const statusDiv = document.getElementById('status');
    const debugDiv = document.getElementById('debugInfo');

    // 1. 獲取 Tableau URL 參數
    const urlParams = new URLSearchParams(window.location.search);
    const tableauUser = urlParams.get('userName') || 'Unknown User'; 
    const dashboardId = urlParams.get('dashboardName') || 'Unknown Dashboard';
    
    // 填充隱藏欄位和除錯資訊
    document.getElementById('tableauUser').value = tableauUser;
    document.getElementById('dashboardId').value = dashboardId;
    debugDiv.innerHTML = `已連結報表: ${dashboardId} | 使用者: ${tableauUser}`;


    // --- 2. 關鍵：圖片貼上和 Base64 轉換邏輯 ---

    let finalBase64String = ''; 
    let finalImageType = '';   

    questionContentDiv.addEventListener('paste', function(e) {
        console.log('偵測到貼上事件。');
        
        // 每次貼上都清除舊狀態
        finalBase64String = ''; 
        finalImageType = '';
        imageDataInput.value = '';
        imageTypeInput.value = '';
        statusDiv.innerHTML = '正在處理貼上內容...';

        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        let imageFound = false;

        for (const item of items) {
            // 檢查貼上內容是否是圖片
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault(); // 阻止瀏覽器預設貼上行為
                imageFound = true;
                const file = item.getAsFile();
                
                if (!file) {
                    console.error('無法獲取圖片文件對象。');
                    statusDiv.innerHTML = '❌ 無法獲取圖片文件對象。';
                    continue;
                }
                
                console.log(`偵測到圖片文件: ${file.type}, 大小: ${file.size}`);

                // 使用 FileReader API 將圖片文件轉換為 Base64 字符串
                const reader = new FileReader();
                
                reader.onload = function(event) {
                    const base64DataURL = event.target.result;
                    
                    // 確保 Data URL 格式正確，並提取 Base64 字符串部分
                    if (base64DataURL.startsWith('data:')) {
                        const parts = base64DataURL.split(',');
                        if (parts.length > 1) {
                            finalBase64String = parts[1]; 
                            finalImageType = file.type;
                            
                            // 更新隱藏欄位
                            imageDataInput.value = finalBase64String;
                            imageTypeInput.value = finalImageType;
                            
                            console.log('✅ Base64 轉換成功，隱藏欄位已更新。');
                            
                            // 在可編輯區域顯示佔位符
                            const imgPlaceholder = document.createElement('img');
                            imgPlaceholder.src = event.target.result;
                            imgPlaceholder.style.maxWidth = '100%';
                            imgPlaceholder.style.height = 'auto';
                            imgPlaceholder.title = '截圖已捕獲 (Base64)';
                            
                            // 清除 contenteditable 區域中的所有內容（只保留圖片）
                            questionContentDiv.innerHTML = ''; 
                            questionContentDiv.appendChild(imgPlaceholder);
                            
                            statusDiv.innerHTML = '✅ 截圖已捕獲！請繼續輸入問題。';
                        } else {
                            console.error('數據 URL 格式錯誤。');
                            statusDiv.innerHTML = '❌ 圖片數據提取失敗。';
                        }
                    } else {
                        console.error('Data URL 格式異常。');
                        statusDiv.innerHTML = '❌ 圖片編碼格式異常。';
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
            // 如果沒有圖片，允許文本正常貼上
            statusDiv.innerHTML = 'ℹ️ 僅貼上了文字。';
        }
    });


    // --- 3. 表單提交邏輯 (發送到 Make) ---

    questionForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // 提取純文本問題內容
        const questionText = questionContentDiv.innerText.trim();
        
        if (!questionText && !imageDataInput.value) {
            statusDiv.innerHTML = '請輸入提問內容或貼上截圖！';
            return;
        }

        const webhookUrl = 'https://hook.eu2.make.com/bwo7q8tfgb6xvcg07mifr1rltt73dge9'; 
        
        // 構造發送到 Make 的數據體 (Payload)
        const payload = {
            question_text: questionText,
            department_id: document.getElementById('dept').value,
            dashboard_id: dashboardId,
            tableau_user: tableauUser,
            // 攜帶圖片數據和類型
            image_data_base64: imageDataInput.value, 
            image_mime_type: imageTypeInput.value || 'image/png' 
        };
        
        console.log('發送的 Payload:', payload); 
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
                // 如果 Make 返回非 2xx 狀態碼，拋出錯誤
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
