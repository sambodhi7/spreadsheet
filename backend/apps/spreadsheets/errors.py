class SpreadsheetDomainError(Exception):
    def __init__(self, detail: str, code: str) -> None:
        self.detail = detail
        self.code = code
        super().__init__(detail)


class RevisionConflict(SpreadsheetDomainError):
    def __init__(self, current_revision: int) -> None:
        self.current_revision = current_revision
        super().__init__("The sheet has changed since it was loaded.", "revision_conflict")
