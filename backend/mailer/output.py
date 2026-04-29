import os

def print_ts_files(base_dir="."):
    target_exts = (".py")

    for root, dirs, files in os.walk(base_dir):
        # node_modules と .next を無視
        for ignore_dir in ["node_modules", ".next", ".venv", "models_refrence"]:
            if ignore_dir in dirs:
                dirs.remove(ignore_dir)

        for file in files:

            if file.startswith( "test_" ):

                continue

            if file.endswith(target_exts) and not file.endswith(".d.ts"):  # 型定義ファイルは除外

                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, base_dir)
                print(f"// {rel_path}")
                print("=" * 80)
                with open(file_path, "r", encoding="utf-8") as f:
                    print(f.read())
                print("\n")

if __name__ == "__main__":
    print_ts_files(".")
