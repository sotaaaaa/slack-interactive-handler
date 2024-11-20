# Sử dụng node:16 làm image gốc
FROM node:16

# Tạo thư mục ứng dụng
WORKDIR /app

# Copy package.json và package-lock.json (nếu có)
COPY package*.json ./

# Cài đặt các dependencies
RUN npm install

# Copy tất cả mã nguồn vào container
COPY . .

# Mở cổng 3000
EXPOSE 3000

# Chạy ứng dụng khi container được khởi động
CMD ["node", "server.js"]
