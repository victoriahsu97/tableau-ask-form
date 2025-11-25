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

    let finalBase64String = ''; // 儲存最終的 Base64 字符串
    let finalImageType = '';   // 儲存圖片類型 (e.g., image/png)

    questionContentDiv.addEventListener('paste', function(e) {
        // 清除之前的圖片數據
        finalBase64String = ''; 
        finalImageType = '';
        imageDataInput.value = '';

        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
            // 檢查貼上內容是否是圖片
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault(); // 阻止瀏覽器默認copy paste
                const file = item.getAsFile();
                
                // 使用 FileReader API 將圖片文件轉換成 Base64 字符串
                const reader = new FileReader();
                reader.onload = function(event) {
                    const base64String = event.target.result;
                    
                    // 將完整的 Data URL (e.g., data:image/png;base64,...) 存入變量
                    finalBase64String = base64String.split(',')[1]; // 僅提取 Base64 字符串部分
                    finalImageType = file.type;
                    
                    // 將 Base64 存入隱藏欄位以準備提交
                    imageDataInput.value = finalBase64String;
                    imageTypeInput.value = finalImageType;
                    
                    // 在可編輯區域顯示一個佔位符，告訴user圖片以接收
                    const imgPlaceholder = document.createElement('img');
                    imgPlaceholder.src = event.target.result;
                    imgPlaceholder.style.maxWidth = '100%';
                    imgPlaceholder.style.height = 'auto';
                    imgPlaceholder.title = 'Screenshot captured (Base64)';
                    
                    // 將佔位符插入到提問內容區域
                    questionContentDiv.appendChild(document.createElement('br'));
                    questionContentDiv.appendChild(imgPlaceholder);
                    questionContentDiv.appendChild(document.createElement('br'));
                    statusDiv.innerHTML = '✅ 截圖已完成！請繼續輸入問題。';
                };
                reader.readAsDataURL(file);
                break; // 只處理第一張照片
            }
        }
    });


    // --- 3. 表單提交邏輯 (發送到 Make) ---

    questionForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // 提取純文本問題內容（不含圖片占位符）
        const questionText = questionContentDiv.innerText.trim();
        
        if (!questionText && !imageDataInput.value) {
            statusDiv.innerHTML = '請輸入提問內容或貼上截圖！';
            return;
        }

        // 替換成你的實際 Make Webhook URL
        const webhookUrl = 'https://hook.eu2.make.com/bwo7q8tfgb6xvcg07mifr1rltt73dge9'; 
        
        // 構造發送到 Make 的數據體 (Payload)
        const payload = {
            question_text: questionText,
            department_id: document.getElementById('dept').value,
            dashboard_id: dashboardId,
            tableau_user: tableauUser,
            // 攜帶圖片數據和類型 (如果存在)
            image_data_base64: imageDataInput.value, 
            image_mime_type: imageTypeInput.value || 'image/png' // 默认 PNG
        };
        
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
            return response.json(); // 假設 Make 返回 JSON
        })
        .then(data => {
            statusDiv.innerHTML = '✅ 問題與截圖以傳送至Slack！';
            // 提交成功後刪除表單
            questionForm.reset();
            questionContentDiv.innerHTML = '';
            imageDataInput.value = '';
            imageTypeInput.value = '';
        })
        .catch(error => {
            console.error('Submission Error:', error);
            statusDiv.innerHTML = '❌ 提交失敗，請檢察網路或聯絡IT';
        });
    });
});
