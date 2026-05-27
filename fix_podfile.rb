# 读取原有的 Podfile
podfile_content = File.read('ios/Podfile')

# 在 platform :ios 那行后面，插入强制指定 React-Core 路径的代码
new_content = podfile_content.gsub("platform :ios, podfile_properties['ios.deploymentTarget'] || '15.1'") do |match|
  match + "\n  pod 'React-Core', :path => '../node_modules/react-native/React'\n  pod 'React-Core-prebuilt', :path => '../node_modules/react-native/React'\n"
end

# 写回 Podfile
File.open('ios/Podfile', 'w') { |file| file.write(new_content) }
