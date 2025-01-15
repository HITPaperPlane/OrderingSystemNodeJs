import requests

# URL 和 Cookie
url = "http://127.0.0.1:3000/protected"
cookies = {
    "username": "user"
}

# 发送请求
response = requests.get(url, cookies=cookies)

# 检查响应状态码
if response.status_code == 200:
    print("页面内容:")
    print(response.text)
else:
    print(f"请求失败，状态码: {response.status_code}")
