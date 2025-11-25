document.addEventListener('DOMContentLoaded', function() {
    const questionForm = document.getElementById('questionForm');
    const questionContentDiv = document.getElementById('questionContent');
    const imageDataInput = document.getElementById('imageData');
    const imageTypeInput = document.getElementById('imageType');
    const statusDiv = document.getElementById('status');
    const debugDiv = document.getElementById('debugInfo');

    // 1. 获取 Tableau URL 參數
    const urlParams = new URLSearchParams(window.location.search);
    const tableauUser = urlParams.get('userName') || 'Unknown User'; 
    const dashboardId = urlParams.get('dashboardName') || 'Unknown Dashboard';
    
    // 填充隱藏欄位和除錯資訊
    document.getElementById('tableauUser').value = tableauUser;
    document.getElementById('dashboardId').value = dashboardId;
    debugDiv.innerHTML = `已連結報表: ${dashboardId} | 使用者: ${tableauUser}`;

    // --- 2. 關鍵：圖片貼上和 Base64 轉換邏輯 ---

    // 確保每次贴上时都清空数据，避免舊數據干擾
    let finalBase64String = ''; 
    let finalImageType = '';   

    questionContentDiv.addEventListener('paste', function(e) {
        console.log('Paste event detected.');
        
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
                e.preventDefault(); // 阻止浏览器默认粘贴行为
                imageFound = true;
                const file = item.getAsFile();
                
                if (!file) {
                    console.error('File object is null/undefined.');
                    statusDiv.innerHTML = '❌ 无法获取图片文件对象，请尝试使用截图工具。';
                    continue;
                }
                
                console.log(`Image file detected: ${file.type}, size: ${file.size}`);

                // 使用 FileReader API 将图片文件转换为 Base64 字符串
                const reader = new FileReader();
                
                reader.onload = function(event) {
                    const base64DataURL = event.target.result;
                    
                    // 確保 Data URL 格式正確，並提取 Base64 字符串部分
                    if (base64DataURL.startsWith('data:')) {
                        // 提取 Base64 字符串 (去除 "data:image/png;base64,")
                        const parts = base64DataURL.split(',');
                        if (parts.length > 1) {
                            finalBase64String = parts[1]; 
                            finalImageType = file.type;
                            
                            // 更新隐藏栏位
                            imageDataInput.value = finalBase64String;
                            imageTypeInput.value = finalImageType;
                            
                            console.log('✅ Base64 conversion successful. Input fields updated.');
                            
                            // 在可编辑区域显示占位符
                            const imgPlaceholder = document.createElement('img');
                            imgPlaceholder.src = event.target.result;
                            imgPlaceholder.style.maxWidth = '100%';
                            imgPlaceholder.style.height = 'auto';
                            imgPlaceholder.title = 'Screenshot captured (Base64)';
                            
                            // 清除 contenteditable 區域中的所有內容（只保留圖片）
                            questionContentDiv.innerHTML = ''; 
                            questionContentDiv.appendChild(imgPlaceholder);
                            
                            statusDiv.innerHTML = '✅ 截图已捕获！请继续输入问题。';
                        } else {
                            console.error('Data URL format error during split.');
                            statusDiv.innerHTML = '❌ 图片数据提取失败。';
                        }
                    } else {
                        console.error('Data URL does not start with "data:".');
                        statusDiv.innerHTML = '❌ 图片编码格式异常。';
                    }
                };
                
                reader.onerror = function() {
                    console.error('FileReader failed to read image.');
                    statusDiv.innerHTML = '❌ 图片读取失败。';
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


    // --- 3. 表单提交逻辑 (发送到 Make) ---

    questionForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // 提取纯文本问题内容（从 div 的 innerText 提取）
        const questionText = questionContentDiv.innerText.trim();
        
        if (!questionText && !imageDataInput.value) {
            statusDiv.innerHTML = '請輸入提問內容或貼上截圖！';
            return;
        }

        const webhookUrl = 'https://hook.eu2.make.com/bwo7q8tfgb6xvcg07mifr1rltt73dge9'; 
        
        const payload = {
            question_text: questionText,
            department_id: document.getElementById('dept').value,
            dashboard_id: dashboardId,
            tableau_user: tableauUser,
            // 确保这些值是从隐藏栏位中读取的
            image_data_base64: imageDataInput.value, 
            image_mime_type: imageTypeInput.value || 'image/png' 
        };
        
        console.log('Payload sent:', payload); // 检查发送前的数据
        statusDiv.innerHTML = '正在發送...';

        // 发送 POST 请求到 Make Webhook
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
            statusDiv.innerHTML = '✅ 问题与截图已成功提交到 Slack！';
            // 提交成功后清除表单
            questionForm.reset();
            questionContentDiv.innerHTML = '';
            imageDataInput.value = '';
            imageTypeInput.value = '';
        })
        .catch(error => {
            console.error('Submission Error:', error);
            statusDiv.innerHTML = '❌ 提交失败，请检查网络或联系 IT 部门。';
        });
    });
});
