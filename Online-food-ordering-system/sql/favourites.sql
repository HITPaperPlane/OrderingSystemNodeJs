CREATE TABLE IF NOT EXISTS `favourites` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,  -- 外键指向 users.id
  `dishId` INT NOT NULL,  -- 外键指向 dishes.id
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- 外键约束
  CONSTRAINT `fk_favourites_userId`
    FOREIGN KEY (`userId`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE 
    ON UPDATE CASCADE,

  CONSTRAINT `fk_favourites_dishId`
    FOREIGN KEY (`dishId`)
    REFERENCES `dishes` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
