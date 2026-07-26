CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "User_role_createdAt_idx" ON "User"("role", "createdAt");

CREATE INDEX "Term_verified_createdAt_idx" ON "Term"("verified", "createdAt");
CREATE INDEX "Term_verified_upvotes_idx" ON "Term"("verified", "upvotes");

CREATE INDEX "News_createdAt_idx" ON "News"("createdAt");
CREATE INDEX "News_category_createdAt_idx" ON "News"("category", "createdAt");
