podfile = File.read('Podfile')

# 删除所有包含 flipper 的行
new_podfile = podfile.lines.reject { |line| line.include?('flipper') }.join

# 在 use_react_native! 所在行后插入新配置
new_podfile = new_podfile.gsub(/^(\s*use_react_native!.+)$/) do |match|
  "#{match}\n  :prebuilt_core_pod_source => '../node_modules/react-native/React',"
end

File.write('Podfile', new_podfile)
puts "Podfile 修复完成"

