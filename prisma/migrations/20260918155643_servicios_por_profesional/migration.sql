-- CreateTable
CREATE TABLE "_ProfesionalToServicio" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProfesionalToServicio_A_fkey" FOREIGN KEY ("A") REFERENCES "profesionales" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProfesionalToServicio_B_fkey" FOREIGN KEY ("B") REFERENCES "servicios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_ProfesionalToServicio_AB_unique" ON "_ProfesionalToServicio"("A", "B");

-- CreateIndex
CREATE INDEX "_ProfesionalToServicio_B_index" ON "_ProfesionalToServicio"("B");

-- Hasta ahora todos hacían todo: se marca así para que nada cambie hasta que alguien desmarque un servicio.
INSERT INTO "_ProfesionalToServicio" ("A", "B") SELECT p."id", s."id" FROM "profesionales" p CROSS JOIN "servicios" s;
