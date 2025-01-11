import os

def write_files_content_to_txt(folder_path, output_file):
    with open(output_file, 'w', encoding='utf-8') as output:
        # 遍历文件夹中的所有文件和子文件夹
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # 写入文件路径、文件名和内容
                        output.write(f"文件路径: {file_path}\n")
                        output.write(f"文件名: {file}\n")
                        output.write(f"文件内容:\n{content}\n")
                        output.write("="*50 + "\n")  # 分隔线
                except Exception as e:
                    output.write(f"无法读取文件 {file_path}: {e}\n")
                    output.write("="*50 + "\n")

if __name__ == "__main__":
    folder_path = "src"
    output_file = "output2.txt"  # 输出文件
    write_files_content_to_txt(folder_path, output_file)
    print(f"内容已保存到 {output_file}")
