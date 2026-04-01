-- Delete PlayerResponse records for players who are no longer
-- associated with the planned game night (orphaned responses)
DELETE FROM "PlayerResponse"
WHERE "id" IN (
    SELECT pr."id"
    FROM "PlayerResponse" pr
    LEFT JOIN "_PlannedGameNightPlayers" pgp
        ON pgp."A" = pr."plannedNightId"
        AND pgp."B" = pr."playerId"
    WHERE pgp."A" IS NULL
);

-- Delete GameVote records for players who are no longer
-- associated with the planned game night (orphaned votes)
DELETE FROM "GameVote"
WHERE "id" IN (
    SELECT gv."id"
    FROM "GameVote" gv
    LEFT JOIN "_PlannedGameNightPlayers" pgp
        ON pgp."A" = gv."plannedNightId"
        AND pgp."B" = gv."playerId"
    WHERE pgp."A" IS NULL
);
