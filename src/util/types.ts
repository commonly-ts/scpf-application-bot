export type DepartmentRank = {
    rankId: number;
    name: string;
    equivalent: {
        name: string;
        rankId: number;
    };
}

export type Department = {
    fullName: string;
    abbreviation: string;
    groupId: number;
    iconUrl: string;
    ranks?: DepartmentRank[];
}

export type DepartmentAbbreviation = "SCPF" | "AD" | "E&T" | "DEA" | "EC" | "SD" | "ScD" | "MD" | "MaD" | "MTF";

export type Application = {
    name: string,
    label: string,
    emoji: string,
    iconUrl: string,
    groupId: number,
    guildId: string,
    closed: boolean,
    submissionChannel: string,
    resultsChannel: string,
    allowedRoles: string[],
    questions: string[],
    autoRank: number,
    autoAccept: boolean,
}

export type ApplicationStatus = "Pending" | "Accepted" | "Denied";
