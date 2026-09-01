-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_RECEIVED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentRecordStatus" AS ENUM ('CREATED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" STRING NOT NULL,
    "name" STRING NOT NULL,
    "email" STRING NOT NULL,
    "phone" STRING NOT NULL,
    "passwordHash" STRING NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "emailVerified" BOOL NOT NULL DEFAULT false,
    "isActive" BOOL NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" STRING NOT NULL,
    "userId" STRING NOT NULL,
    "label" STRING NOT NULL,
    "recipientName" STRING NOT NULL,
    "phone" STRING NOT NULL,
    "addressLine1" STRING NOT NULL,
    "addressLine2" STRING,
    "landmark" STRING,
    "city" STRING NOT NULL,
    "state" STRING NOT NULL,
    "postalCode" STRING NOT NULL,
    "latitude" FLOAT8,
    "longitude" FLOAT8,
    "isDefault" BOOL NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" STRING NOT NULL,
    "orderNumber" STRING NOT NULL,
    "userId" STRING NOT NULL,
    "addressId" STRING,
    "customerName" STRING NOT NULL,
    "customerEmail" STRING NOT NULL,
    "customerPhone" STRING NOT NULL,
    "deliveryAddressSnapshot" STRING NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "deliveryCharge" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(12,2) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "orderStatus" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "customerNotes" STRING,
    "adminNotes" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "preparingAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" STRING NOT NULL,
    "orderId" STRING NOT NULL,
    "provider" STRING NOT NULL,
    "providerOrderId" STRING,
    "providerPaymentId" STRING,
    "providerSignature" STRING,
    "upiTransactionId" STRING,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" STRING NOT NULL DEFAULT 'INR',
    "status" "PaymentRecordStatus" NOT NULL DEFAULT 'CREATED',
    "paymentMethod" STRING NOT NULL DEFAULT 'UPI',
    "failureReason" STRING,
    "rawProviderResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" STRING NOT NULL,
    "orderId" STRING NOT NULL,
    "oldStatus" "OrderStatus",
    "newStatus" "OrderStatus" NOT NULL,
    "changedByUserId" STRING,
    "notes" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" STRING NOT NULL,
    "categoryId" STRING NOT NULL,
    "name" STRING NOT NULL,
    "slug" STRING NOT NULL,
    "shortDescription" STRING NOT NULL,
    "description" STRING,
    "sku" STRING NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "compareAtPrice" DECIMAL(12,2),
    "imageUrl" STRING,
    "thumbnailUrl" STRING,
    "isVegetarian" BOOL NOT NULL DEFAULT true,
    "isVegan" BOOL NOT NULL DEFAULT false,
    "isSpicy" BOOL NOT NULL DEFAULT false,
    "spiceLevel" INT4 NOT NULL DEFAULT 0,
    "preparationTimeMinutes" INT4 NOT NULL DEFAULT 15,
    "stockQuantity" INT4,
    "trackInventory" BOOL NOT NULL DEFAULT false,
    "minimumOrderQuantity" INT4 NOT NULL DEFAULT 1,
    "maximumOrderQuantity" INT4,
    "isAvailable" BOOL NOT NULL DEFAULT true,
    "isFeatured" BOOL NOT NULL DEFAULT false,
    "displayOrder" INT4 NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" STRING NOT NULL,
    "productId" STRING NOT NULL,
    "imageUrl" STRING NOT NULL,
    "altText" STRING,
    "displayOrder" INT4 NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" STRING NOT NULL,
    "userId" STRING NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" STRING NOT NULL,
    "name" STRING NOT NULL,
    "slug" STRING NOT NULL,
    "description" STRING,
    "imageUrl" STRING,
    "displayOrder" INT4 NOT NULL DEFAULT 0,
    "isActive" BOOL NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" STRING NOT NULL,
    "orderId" STRING NOT NULL,
    "productId" STRING,
    "productNameSnapshot" STRING NOT NULL,
    "productSkuSnapshot" STRING NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "quantity" INT4 NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" STRING NOT NULL,
    "adminUserId" STRING NOT NULL,
    "action" STRING NOT NULL,
    "entityType" STRING NOT NULL,
    "entityId" STRING,
    "beforeData" JSONB,
    "afterData" JSONB,
    "ipAddress" STRING,
    "userAgent" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" STRING NOT NULL,
    "userId" STRING,
    "orderId" STRING,
    "recipient" STRING NOT NULL,
    "subject" STRING NOT NULL,
    "template" STRING NOT NULL,
    "status" "EmailStatus" NOT NULL,
    "providerMessageId" STRING,
    "errorMessage" STRING,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" STRING NOT NULL,
    "userId" STRING NOT NULL,
    "tokenHash" STRING NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" STRING NOT NULL,
    "cartId" STRING NOT NULL,
    "productId" STRING NOT NULL,
    "quantity" INT4 NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_orderStatus_idx" ON "Order"("orderStatus");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_providerPaymentId_idx" ON "Payment"("providerPaymentId");

-- CreateIndex
CREATE INDEX "Payment_providerOrderId_idx" ON "Payment"("providerOrderId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_idx" ON "OrderStatusHistory"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_slug_idx" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_isAvailable_idx" ON "Product"("isAvailable");

-- CreateIndex
CREATE INDEX "Product_isFeatured_idx" ON "Product"("isFeatured");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminUserId_idx" ON "AdminAuditLog"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_orderId_idx" ON "EmailLog"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_key" ON "CartItem"("cartId", "productId");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

